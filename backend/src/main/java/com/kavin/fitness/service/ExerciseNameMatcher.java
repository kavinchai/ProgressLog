package com.kavin.fitness.service;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Decides whether two exercise names are the same lift, so a new name can be pointed at the one
 * people already use ("Lat Pull Down" → "Lat Pulldowns").
 *
 * <p>Kept strict on purpose: only spelling-level differences (case, spacing, punctuation, plurals,
 * word order, a typo or two on longer names) and the aliases below count. A real word difference —
 * "Dumbbell" vs "Bench" — is never treated as the same lift.
 */
public final class ExerciseNameMatcher {

    private ExerciseNameMatcher() {}

    /** Synonyms that spelling rules can't catch, as compact keys (see {@link #compact}). */
    private static final Map<String, String> ALIASES =
            Map.ofEntries(
                    Map.entry("inclinebarbellpress", "inclinebenchpress"),
                    Map.entry("barbellbenchpress", "benchpress"),
                    Map.entry("flatbenchpress", "benchpress"),
                    Map.entry("dumbbellbicepcurl", "bicepcurl"),
                    Map.entry("bicepcurldumbbell", "bicepcurl"),
                    Map.entry("triceppulldown", "triceppushdown"),
                    Map.entry("cabletriceppulldown", "triceppushdown"),
                    Map.entry("cabletriceppushdown", "triceppushdown"),
                    Map.entry("rdl", "romaniandeadlift"),
                    Map.entry("ohp", "overheadpress"));

    /** Lower-case words with punctuation dropped and each word made singular. */
    static List<String> words(String name) {
        if (name == null) return List.of();
        return Arrays.stream(name.toLowerCase().replaceAll("[-_/]", " ").split("\\s+"))
                .map(w -> w.replaceAll("[^a-z0-9]", ""))
                .filter(w -> !w.isEmpty())
                .map(ExerciseNameMatcher::singular)
                .toList();
    }

    private static String singular(String w) {
        if (w.length() > 4 && w.endsWith("ies")) return w.substring(0, w.length() - 3) + "y";
        if (w.length() > 4 && w.endsWith("sses")) return w.substring(0, w.length() - 2);
        if (w.length() >= 3 && w.endsWith("s") && !w.endsWith("ss"))
            return w.substring(0, w.length() - 1);
        return w;
    }

    /** The words run together, with aliases applied: "Lat Pull Down" → "latpulldown". */
    static String compact(String name) {
        String key = String.join("", words(name));
        return ALIASES.getOrDefault(key, key);
    }

    private static String sortedWords(String name) {
        return words(name).stream().sorted().collect(Collectors.joining(" "));
    }

    /** True when the two names are spelling variants of the same lift. */
    public static boolean isSameLift(String a, String b) {
        String ka = compact(a);
        String kb = compact(b);
        if (ka.isEmpty() || kb.isEmpty()) return false;
        if (ka.equals(kb) || sortedWords(a).equals(sortedWords(b))) return true;
        return oneWordTypo(words(a), words(b));
    }

    /** Word pairs that differ by a letter or two but mean different lifts. */
    private static final Set<Set<String>> OPPOSITES =
            Set.of(Set.of("abduction", "adduction"), Set.of("pushdown", "pulldown"));

    /**
     * Same words except one, which has a small typo: same first letter, at least 5 letters, one
     * edit (two for 9+ letters). A typo is never allowed to change a short or leading word, so
     * "Hack Squat" stays apart from "Back Squat" and "Incline" from "Decline".
     */
    private static boolean oneWordTypo(List<String> a, List<String> b) {
        if (a.size() != b.size()) return false;
        int differing = -1;
        for (int i = 0; i < a.size(); i++) {
            if (a.get(i).equals(b.get(i))) continue;
            if (differing >= 0) return false;
            differing = i;
        }
        if (differing < 0) return false;
        String x = a.get(differing);
        String y = b.get(differing);
        if (x.charAt(0) != y.charAt(0) || Math.min(x.length(), y.length()) < 5) return false;
        if (OPPOSITES.contains(Set.of(x, y))) return false;
        int allowed = Math.max(x.length(), y.length()) >= 9 ? 2 : 1;
        return editDistance(x, y) <= allowed;
    }

    /**
     * The looser "maybe" check: every word typed (at least two) appears in the existing name.
     * "incline press" fits both "Incline Bench Press" and "Incline Dumbbell Press".
     */
    public static boolean containsAllWords(String typed, String existing) {
        List<String> typedWords = words(typed);
        if (typedWords.size() < 2) return false;
        Set<String> existingWords = Set.copyOf(words(existing));
        return existingWords.containsAll(typedWords);
    }

    /** Edit distance where swapping two neighbouring letters counts as one typo. */
    private static int editDistance(String a, String b) {
        int[][] d = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) d[i][0] = i;
        for (int j = 0; j <= b.length(); j++) d[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                d[i][j] =
                        Math.min(
                                Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1), d[i - 1][j - 1] + cost);
                if (i > 1
                        && j > 1
                        && a.charAt(i - 1) == b.charAt(j - 2)
                        && a.charAt(i - 2) == b.charAt(j - 1)) {
                    d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
                }
            }
        }
        return d[a.length()][b.length()];
    }
}
