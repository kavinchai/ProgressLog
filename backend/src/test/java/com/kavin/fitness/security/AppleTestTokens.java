package com.kavin.fitness.security;

import io.jsonwebtoken.Jwts;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.NoSuchAlgorithmException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/** Mints identity tokens shaped like Apple's, signed with a key the tests control. */
public final class AppleTestTokens {

    public static final String KID = "test-kid";
    public static final String CLIENT_ID = "com.kavin.progresslog";
    public static final String ISSUER = "https://appleid.apple.com";

    private static final KeyPair KEYS = rsaKeyPair();
    private static final KeyPair OTHER_KEYS = rsaKeyPair();

    private AppleTestTokens() {}

    public static PublicKey publicKey() {
        return KEYS.getPublic();
    }

    /** A valid token for this Apple user. */
    public static String token(String subject, String email) {
        return build(subject, email, CLIENT_ID, ISSUER, Duration.ofMinutes(10), KEYS.getPrivate());
    }

    public static String tokenForAudience(String subject, String audience) {
        return build(subject, null, audience, ISSUER, Duration.ofMinutes(10), KEYS.getPrivate());
    }

    public static String tokenFromIssuer(String subject, String issuer) {
        return build(subject, null, CLIENT_ID, issuer, Duration.ofMinutes(10), KEYS.getPrivate());
    }

    public static String expiredToken(String subject) {
        return build(subject, null, CLIENT_ID, ISSUER, Duration.ofMinutes(-10), KEYS.getPrivate());
    }

    /** Right claims, but signed by a key Apple never published. */
    public static String forgedToken(String subject) {
        return build(
                subject, null, CLIENT_ID, ISSUER, Duration.ofMinutes(10), OTHER_KEYS.getPrivate());
    }

    private static String build(
            String subject,
            String email,
            String audience,
            String issuer,
            Duration validFor,
            PrivateKey key) {
        Instant now = Instant.now();
        var builder =
                Jwts.builder()
                        .header()
                        .keyId(KID)
                        .and()
                        .issuer(issuer)
                        .subject(subject)
                        .audience()
                        .add(audience)
                        .and()
                        .issuedAt(Date.from(now.minus(Duration.ofMinutes(1))))
                        .expiration(Date.from(now.plus(validFor)));
        if (email != null) builder.claim("email", email);
        return builder.signWith(key, Jwts.SIG.RS256).compact();
    }

    private static KeyPair rsaKeyPair() {
        try {
            KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
            generator.initialize(2048);
            return generator.generateKeyPair();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
