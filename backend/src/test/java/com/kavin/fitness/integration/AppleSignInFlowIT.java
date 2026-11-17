package com.kavin.fitness.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import com.kavin.fitness.security.AppleKeySource;
import com.kavin.fitness.security.AppleTestTokens;
import com.kavin.fitness.security.AppleTokenClient;
import jakarta.servlet.http.Cookie;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Sign in with Apple in the iPhone app: a new Apple ID picks a username and gets an account with no
 * password; an Apple ID connected from Settings opens the existing account; deleting an account
 * revokes the Apple sign-in.
 */
class AppleSignInFlowIT extends IntegrationTestBase {

    private static final int THIRTY_DAYS = 30 * 24 * 60 * 60;

    @MockBean private AppleKeySource appleKeys;
    @MockBean private AppleTokenClient appleTokens;
    @Autowired private JdbcTemplate jdbc;

    @BeforeEach
    void appleKeys() {
        when(appleKeys.publicKey(AppleTestTokens.KID)).thenReturn(AppleTestTokens.publicKey());
        when(appleTokens.exchangeForRefreshToken(anyString())).thenReturn(Optional.empty());
    }

    // ── Signing in ───────────────────────────────────────────────────────────

    @Test
    void unknownAppleId_asksForAUsername_andSignsNobodyIn() throws Exception {
        MvcResult result =
                appleSignIn(AppleTestTokens.token("apple-new", "new@privaterelay.appleid.com"))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.needsUsername").value(true))
                        .andExpect(jsonPath("$.username").doesNotExist())
                        .andReturn();

        assertThat(result.getResponse().getCookie("jwt")).isNull();
        assertThat(userCount()).isZero();
    }

    @Test
    void newAppleId_picksAUsername_andGetsAnAccountWithNoPassword() throws Exception {
        String token = AppleTestTokens.token("apple-new", "new@privaterelay.appleid.com");

        MvcResult result =
                appleRegister(token, "applelifter", true)
                        .andExpect(status().isCreated())
                        .andExpect(jsonPath("$.username").value("applelifter"))
                        .andReturn();

        Cookie cookie = result.getResponse().getCookie("jwt");
        assertThat(cookie.getMaxAge()).isEqualTo(THIRTY_DAYS);
        mockMvc.perform(get("/api/profile/sign-in").cookie(cookie))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appleConnected").value(true))
                .andExpect(jsonPath("$.passwordSet").value(false));
        mockMvc.perform(get("/api/profile/email").cookie(cookie))
                .andExpect(jsonPath("$.email").value("new@privaterelay.appleid.com"));
    }

    @Test
    void returningAppleUser_isSignedStraightIn() throws Exception {
        appleRegister(AppleTestTokens.token("apple-back", null), "backagain", false)
                .andExpect(status().isCreated());

        MvcResult result =
                appleSignIn(AppleTestTokens.token("apple-back", null))
                        .andExpect(status().isOk())
                        .andExpect(jsonPath("$.username").value("backagain"))
                        .andExpect(jsonPath("$.needsUsername").value(false))
                        .andReturn();

        Cookie cookie = result.getResponse().getCookie("jwt");
        mockMvc.perform(get("/api/profile/goals").cookie(cookie)).andExpect(status().isOk());
    }

    @Test
    void appleOnlyAccount_cannotSignInWithAPassword() throws Exception {
        appleRegister(AppleTestTokens.token("apple-nopw", null), "nopassword", false)
                .andExpect(status().isCreated());

        mockMvc.perform(
                        post("/api/auth/login")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("username", "nopassword", "password", ""))))
                .andExpect(status().is4xxClientError());
    }

    @Test
    void badAppleTokens_areRejected() throws Exception {
        for (String token :
                new String[] {
                    AppleTestTokens.forgedToken("apple-x"),
                    AppleTestTokens.expiredToken("apple-x"),
                    AppleTestTokens.tokenForAudience("apple-x", "com.someone.else"),
                    "garbage"
                }) {
            appleSignIn(token)
                    .andExpect(status().isBadRequest())
                    .andExpect(
                            jsonPath("$.message")
                                    .value("Sign in with Apple couldn't be verified. Try again."));
        }
        appleRegister(AppleTestTokens.forgedToken("apple-x"), "forger", false)
                .andExpect(status().isBadRequest());
        assertThat(userCount()).isZero();
    }

    @Test
    void register_rejectsATakenUsername() throws Exception {
        registerAndGetToken("taken", "securepass123");

        appleRegister(AppleTestTokens.token("apple-new", null), "taken", false)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username already taken."));
    }

    @Test
    void register_rejectsAShortUsername() throws Exception {
        appleRegister(AppleTestTokens.token("apple-new", null), "ab", false)
                .andExpect(status().isBadRequest());
    }

    @Test
    void register_rejectsAnAppleIdThatAlreadyHasAnAccount() throws Exception {
        appleRegister(AppleTestTokens.token("apple-twice", null), "firstone", false)
                .andExpect(status().isCreated());

        appleRegister(AppleTestTokens.token("apple-twice", null), "secondone", false)
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message")
                                .value(
                                        "This Apple ID already has an account. Sign in with Apple"
                                                + " instead."));
    }

    @Test
    void signIn_keepsTheAppleRefreshTokenWhenTheKeyIsConfigured() throws Exception {
        when(appleTokens.exchangeForRefreshToken("code-1")).thenReturn(Optional.of("refresh-1"));

        appleRegister(AppleTestTokens.token("apple-key", null), "withkey", false, "code-1")
                .andExpect(status().isCreated());

        assertThat(refreshTokenOf("withkey")).isEqualTo("refresh-1");
    }

    // ── Connecting an existing account ───────────────────────────────────────

    @Test
    void connectingFromSettings_letsAppleSignInOpenTheExistingAccount() throws Exception {
        String jwt = registerAndGetToken("pwuser", "securepass123");

        mockMvc.perform(
                        post("/api/profile/apple")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "identityToken",
                                                        AppleTestTokens.token(
                                                                "apple-link", null)))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.appleConnected").value(true))
                .andExpect(jsonPath("$.passwordSet").value(true));

        appleSignIn(AppleTestTokens.token("apple-link", null))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("pwuser"));
        assertThat(userCount()).isEqualTo(1);
    }

    @Test
    void connecting_anAppleIdUsedByAnotherAccount_isRefused() throws Exception {
        appleRegister(AppleTestTokens.token("apple-owned", null), "owner", false)
                .andExpect(status().isCreated());
        String jwt = registerAndGetToken("someoneelse", "securepass123");

        mockMvc.perform(
                        post("/api/profile/apple")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "identityToken",
                                                        AppleTestTokens.token(
                                                                "apple-owned", null)))))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message")
                                .value("This Apple ID is already connected to another account."));
    }

    @Test
    void passwordAccount_showsAppleNotConnected() throws Exception {
        String jwt = registerAndGetToken("plain", "securepass123");

        mockMvc.perform(get("/api/profile/sign-in").header("Authorization", "Bearer " + jwt))
                .andExpect(jsonPath("$.appleConnected").value(false))
                .andExpect(jsonPath("$.passwordSet").value(true));
    }

    // ── Accounts without a password ──────────────────────────────────────────

    @Test
    void appleOnlyAccount_canSetAPassword_withoutACurrentOne() throws Exception {
        Cookie cookie = appleAccount("apple-setpw", "setpw");

        mockMvc.perform(
                        put("/api/profile/credentials")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("newPassword", "brandnew123"))))
                .andExpect(status().isOk());

        loginAndGetToken("setpw", "brandnew123");
        mockMvc.perform(get("/api/profile/sign-in").cookie(cookie))
                .andExpect(jsonPath("$.passwordSet").value(true));
    }

    @Test
    void appleOnlyAccount_canChangeItsUsername_withoutAPassword() throws Exception {
        Cookie cookie = appleAccount("apple-rename", "oldname");

        mockMvc.perform(
                        put("/api/profile/credentials")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("newUsername", "newname"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("newname"));
    }

    @Test
    void passwordAccount_stillNeedsItsCurrentPassword() throws Exception {
        String jwt = registerAndGetToken("needspw", "securepass123");

        mockMvc.perform(
                        put("/api/profile/credentials")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("newPassword", "brandnew123"))))
                .andExpect(status().isUnauthorized());
    }

    // ── Deleting the account ─────────────────────────────────────────────────

    @Test
    void appleOnlyAccount_deletesAfterConfirmingWithApple_andRevokesTheAppleSignIn()
            throws Exception {
        when(appleTokens.exchangeForRefreshToken("code-del")).thenReturn(Optional.of("refresh-d"));
        appleRegister(AppleTestTokens.token("apple-del", null), "deleteme", false, "code-del")
                .andExpect(status().isCreated());
        Cookie cookie =
                appleSignIn(AppleTestTokens.token("apple-del", null))
                        .andReturn()
                        .getResponse()
                        .getCookie("jwt");

        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "appleIdentityToken",
                                                        AppleTestTokens.token("apple-del", null)))))
                .andExpect(status().isNoContent());

        assertThat(userCount()).isZero();
        verify(appleTokens).revoke("refresh-d");
    }

    @Test
    void appleOnlyAccount_isNotDeletedByAnotherAppleId() throws Exception {
        Cookie cookie = appleAccount("apple-mine", "keepme");

        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "appleIdentityToken",
                                                        AppleTestTokens.token(
                                                                "apple-not-mine", null)))))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message")
                                .value("That Apple ID isn't connected to this account."));

        assertThat(userCount()).isEqualTo(1);
        verify(appleTokens, never()).revoke(any());
    }

    @Test
    void appleOnlyAccount_isNotDeletedWithoutConfirmingWithApple() throws Exception {
        Cookie cookie = appleAccount("apple-noconfirm", "noconfirm");

        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(
                        jsonPath("$.message").value("Confirm with Apple to delete your account."));

        assertThat(userCount()).isEqualTo(1);
        verify(appleTokens, never()).revoke(any());
    }

    @Test
    void passwordAccountWithAppleConnected_revokesTheAppleSignInWhenDeleted() throws Exception {
        when(appleTokens.exchangeForRefreshToken("code-link")).thenReturn(Optional.of("refresh-l"));
        String jwt = registerAndGetToken("linkeddelete", "securepass123");
        mockMvc.perform(
                        post("/api/profile/apple")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "identityToken",
                                                        AppleTestTokens.token("apple-ld", null),
                                                        "authorizationCode",
                                                        "code-link"))))
                .andExpect(status().isOk());

        mockMvc.perform(
                        post("/api/profile/delete-account")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("password", "securepass123"))))
                .andExpect(status().isNoContent());

        verify(appleTokens).revoke("refresh-l");
    }

    @Test
    void passwordAccount_cannotSkipItsPasswordWithAnAppleToken() throws Exception {
        String jwt = registerAndGetToken("pwfirst", "securepass123");
        connectApple(jwt, "apple-pwfirst");

        deleteAccount(
                        jwt,
                        Map.of("appleIdentityToken", AppleTestTokens.token("apple-pwfirst", null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect password."));
        deleteAccount(jwt, Map.of())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect password."));
        deleteAccount(jwt, Map.of("password", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Incorrect password."));

        assertThat(userCount()).isEqualTo(1);
        verify(appleTokens, never()).revoke(any());
    }

    @Test
    void appleAccountThatSetAPassword_needsThePasswordToDelete() throws Exception {
        Cookie cookie = appleAccount("apple-later-pw", "laterpw");
        mockMvc.perform(
                        put("/api/profile/credentials")
                                .cookie(cookie)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(json(Map.of("newPassword", "brandnew123"))))
                .andExpect(status().isOk());
        String jwt = loginAndGetToken("laterpw", "brandnew123");

        deleteAccount(
                        jwt,
                        Map.of("appleIdentityToken", AppleTestTokens.token("apple-later-pw", null)))
                .andExpect(status().isBadRequest());
        assertThat(userCount()).isEqualTo(1);

        deleteAccount(jwt, Map.of("password", "brandnew123")).andExpect(status().isNoContent());
        assertThat(userCount()).isZero();
    }

    @Test
    void passwordAccount_keepsItsPasswordAfterAWrongCurrentPassword() throws Exception {
        String jwt = registerAndGetToken("wrongcurrent", "securepass123");

        mockMvc.perform(
                        put("/api/profile/credentials")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "currentPassword", "notmypassword",
                                                        "newPassword", "brandnew123"))))
                .andExpect(status().isUnauthorized());

        loginAndGetToken("wrongcurrent", "securepass123");
    }

    @Test
    void signInMethodsAndConnecting_needASignIn() throws Exception {
        mockMvc.perform(get("/api/profile/sign-in")).andExpect(status().isUnauthorized());
        mockMvc.perform(
                        post("/api/profile/apple")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "identityToken",
                                                        AppleTestTokens.token(
                                                                "apple-anon", null)))))
                .andExpect(status().isUnauthorized());
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private ResultActions appleSignIn(String identityToken) throws Exception {
        return mockMvc.perform(
                post("/api/auth/apple")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("identityToken", identityToken))));
    }

    private ResultActions appleRegister(String identityToken, String username, boolean remember)
            throws Exception {
        return appleRegister(identityToken, username, remember, null);
    }

    private ResultActions appleRegister(
            String identityToken, String username, boolean remember, String code) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("identityToken", identityToken);
        body.put("username", username);
        body.put("rememberMe", remember);
        if (code != null) body.put("authorizationCode", code);
        return mockMvc.perform(
                post("/api/auth/apple/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)));
    }

    private Cookie appleAccount(String subject, String username) throws Exception {
        return appleRegister(AppleTestTokens.token(subject, null), username, false)
                .andExpect(status().isCreated())
                .andReturn()
                .getResponse()
                .getCookie("jwt");
    }

    private void connectApple(String jwt, String subject) throws Exception {
        mockMvc.perform(
                        post("/api/profile/apple")
                                .header("Authorization", "Bearer " + jwt)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(
                                        json(
                                                Map.of(
                                                        "identityToken",
                                                        AppleTestTokens.token(subject, null)))))
                .andExpect(status().isOk());
    }

    private ResultActions deleteAccount(String jwt, Map<String, ?> body) throws Exception {
        return mockMvc.perform(
                post("/api/profile/delete-account")
                        .header("Authorization", "Bearer " + jwt)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)));
    }

    private String json(Object body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private int userCount() {
        return jdbc.queryForObject("SELECT COUNT(*) FROM users", Integer.class);
    }

    private String refreshTokenOf(String username) {
        return jdbc.queryForObject(
                "SELECT apple_refresh_token FROM users WHERE username = ?", String.class, username);
    }
}
