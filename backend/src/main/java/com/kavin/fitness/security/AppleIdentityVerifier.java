package com.kavin.fitness.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.ProtectedHeader;
import io.jsonwebtoken.UnsupportedJwtException;
import java.security.Key;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Checks a Sign in with Apple identity token from the iPhone app: signed by Apple, issued by Apple,
 * meant for this app, and not expired.
 */
@Component
public class AppleIdentityVerifier {

    static final String ISSUER = "https://appleid.apple.com";
    static final String REJECTED = "Sign in with Apple couldn't be verified. Try again.";

    /** Who Apple says signed in. Email is only there if the user shared one. */
    public record AppleIdentity(String subject, String email) {}

    private final AppleKeySource keys;
    private final String clientId;

    public AppleIdentityVerifier(
            AppleKeySource keys,
            @Value("${app.apple.client-id:com.kavin.progresslog}") String clientId) {
        this.keys = keys;
        this.clientId = clientId;
    }

    public AppleIdentity verify(String identityToken) {
        if (identityToken == null || identityToken.isBlank()) {
            throw new IllegalArgumentException(REJECTED);
        }
        try {
            Claims claims =
                    Jwts.parser()
                            .keyLocator(this::appleKey)
                            .requireIssuer(ISSUER)
                            .requireAudience(clientId)
                            .clockSkewSeconds(60)
                            .build()
                            .parseSignedClaims(identityToken)
                            .getPayload();
            String subject = claims.getSubject();
            if (subject == null || subject.isBlank()) {
                throw new IllegalArgumentException(REJECTED);
            }
            return new AppleIdentity(subject, claims.get("email", String.class));
        } catch (JwtException | IllegalArgumentException e) {
            throw new IllegalArgumentException(REJECTED);
        }
    }

    private Key appleKey(io.jsonwebtoken.Header header) {
        String kid =
                header instanceof ProtectedHeader protectedHeader
                        ? protectedHeader.getKeyId()
                        : null;
        Key key = kid == null ? null : keys.publicKey(kid);
        if (key == null) {
            throw new UnsupportedJwtException("Unknown Apple signing key");
        }
        return key;
    }
}
