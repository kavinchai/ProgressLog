package com.kavin.fitness.security;

import java.security.PublicKey;

/** Apple's public keys for checking Sign in with Apple identity tokens, by key id. */
@FunctionalInterface
public interface AppleKeySource {

    /** The key with this id, or null if Apple hasn't published one. */
    PublicKey publicKey(String kid);
}
