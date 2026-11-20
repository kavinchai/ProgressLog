package com.kavin.fitness.integration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kavin.fitness.service.EmailService;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.ResultActions;

/**
 * Forgot password: a 6-digit code is emailed to the account's address and, typed back in with a new
 * password, replaces the old password. The request never reveals whether an account exists.
 */
class PasswordResetFlowIT extends IntegrationTestBase {

    @MockBean private EmailService email;
    @Autowired private JdbcTemplate jdbc;

    private static final Pattern CODE = Pattern.compile("\\b(\\d{6})\\b");

    private ResultActions forgot(String identifier) throws Exception {
        return mockMvc.perform(
                post("/api/auth/forgot-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                objectMapper.writeValueAsString(Map.of("identifier", identifier))));
    }

    private ResultActions reset(String identifier, String code, String newPassword)
            throws Exception {
        return mockMvc.perform(
                post("/api/auth/reset-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                objectMapper.writeValueAsString(
                                        Map.of(
                                                "identifier", identifier,
                                                "code", code,
                                                "newPassword", newPassword))));
    }

    /** The code from the last email sent to this address. */
    private String sentCode(String to) {
        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(email, org.mockito.Mockito.atLeastOnce()).send(eq(to), anyString(), body.capture());
        Matcher m = CODE.matcher(body.getValue());
        assertThat(m.find()).as("email body has a 6-digit code").isTrue();
        return m.group(1);
    }

    private ResultActions login(String username, String password) throws Exception {
        return mockMvc.perform(
                post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(
                                objectMapper.writeValueAsString(
                                        Map.of("username", username, "password", password))));
    }

    @Test
    void resetByUsername_emailsACode_thatSetsTheNewPassword() throws Exception {
        registerAndGetToken("resetme", "oldpass1");

        forgot("resetme").andExpect(status().isNoContent());
        String code = sentCode("resetme@test.com");

        reset("resetme", code, "newpass1").andExpect(status().isNoContent());

        login("resetme", "newpass1").andExpect(status().isOk());
        login("resetme", "oldpass1").andExpect(status().isUnauthorized());
    }

    @Test
    void resetByEmail_works_andIgnoresCase() throws Exception {
        registerAndGetToken("byemail", "oldpass1");

        forgot("ByEmail@Test.com").andExpect(status().isNoContent());
        String code = sentCode("byemail@test.com");

        reset("ByEmail@Test.com", code, "newpass1").andExpect(status().isNoContent());
        login("byemail", "newpass1").andExpect(status().isOk());
    }

    @Test
    void unknownAccount_answersTheSame_andSendsNothing() throws Exception {
        forgot("nobody").andExpect(status().isNoContent());
        verify(email, never()).send(anyString(), anyString(), anyString());
    }

    @Test
    void wrongCode_isRejected_andKeepsTheOldPassword() throws Exception {
        registerAndGetToken("wrongcode", "oldpass1");
        forgot("wrongcode").andExpect(status().isNoContent());
        String code = sentCode("wrongcode@test.com");
        String wrong = code.equals("000000") ? "111111" : "000000";

        reset("wrongcode", wrong, "newpass1")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("That code is incorrect or has expired."));
        login("wrongcode", "oldpass1").andExpect(status().isOk());
    }

    @Test
    void fiveWrongTries_cancelTheCode() throws Exception {
        registerAndGetToken("locked", "oldpass1");
        forgot("locked").andExpect(status().isNoContent());
        String code = sentCode("locked@test.com");
        String wrong = code.equals("000000") ? "111111" : "000000";

        for (int i = 0; i < 5; i++) {
            reset("locked", wrong, "newpass1").andExpect(status().isBadRequest());
        }
        reset("locked", code, "newpass1").andExpect(status().isBadRequest());
        login("locked", "oldpass1").andExpect(status().isOk());
    }

    @Test
    void expiredCode_isRejected() throws Exception {
        registerAndGetToken("expired", "oldpass1");
        forgot("expired").andExpect(status().isNoContent());
        String code = sentCode("expired@test.com");
        jdbc.update("UPDATE password_reset_code SET expires_at = NOW() - INTERVAL '1 minute'");

        reset("expired", code, "newpass1").andExpect(status().isBadRequest());
        login("expired", "oldpass1").andExpect(status().isOk());
    }

    @Test
    void code_worksOnlyOnce() throws Exception {
        registerAndGetToken("onceonly", "oldpass1");
        forgot("onceonly").andExpect(status().isNoContent());
        String code = sentCode("onceonly@test.com");

        reset("onceonly", code, "newpass1").andExpect(status().isNoContent());
        reset("onceonly", code, "another1").andExpect(status().isBadRequest());
        login("onceonly", "newpass1").andExpect(status().isOk());
    }

    @Test
    void askingAgainRightAway_doesNotSendAnotherEmail() throws Exception {
        registerAndGetToken("twice", "oldpass1");

        forgot("twice").andExpect(status().isNoContent());
        forgot("twice").andExpect(status().isNoContent());

        verify(email, times(1)).send(eq("twice@test.com"), anyString(), anyString());
    }

    @Test
    void emailOnSeveralAccounts_asksForTheUsername_andIssuesNoCode() throws Exception {
        registerAndGetToken("shared1", "oldpass1");
        registerAndGetToken("shared2", "oldpass1");
        jdbc.update("UPDATE users SET email = 'family@test.com'");

        forgot("family@test.com").andExpect(status().isNoContent());

        ArgumentCaptor<String> body = ArgumentCaptor.forClass(String.class);
        verify(email).send(eq("family@test.com"), anyString(), body.capture());
        assertThat(body.getValue()).contains("shared1", "shared2").doesNotContainPattern(CODE);
        assertThat(jdbc.queryForObject("SELECT COUNT(*) FROM password_reset_code", Integer.class))
                .isZero();
    }

    @Test
    void newPassword_mustBeAtLeastSixCharacters() throws Exception {
        registerAndGetToken("shortpw", "oldpass1");
        forgot("shortpw").andExpect(status().isNoContent());
        String code = sentCode("shortpw@test.com");

        reset("shortpw", code, "abc").andExpect(status().isBadRequest());
        login("shortpw", "oldpass1").andExpect(status().isOk());
    }

    @Test
    void appleOnlyAccount_canSetAPasswordWithACode() throws Exception {
        registerAndGetToken("appleonly", "placeholder1");
        jdbc.update("UPDATE users SET password_set = false WHERE username = 'appleonly'");

        forgot("appleonly").andExpect(status().isNoContent());
        reset("appleonly", sentCode("appleonly@test.com"), "newpass1")
                .andExpect(status().isNoContent());

        assertThat(
                        jdbc.queryForObject(
                                "SELECT password_set FROM users WHERE username = 'appleonly'",
                                Boolean.class))
                .isTrue();
        login("appleonly", "newpass1").andExpect(status().isOk());
    }
}
