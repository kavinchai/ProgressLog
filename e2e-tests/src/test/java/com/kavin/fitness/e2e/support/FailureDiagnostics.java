package com.kavin.fitness.e2e.support;

import org.openqa.selenium.JavascriptExecutor;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.logging.LogEntry;
import org.openqa.selenium.logging.LogType;
import org.testng.ITestListener;
import org.testng.ITestResult;

import java.io.IOException;
import java.lang.reflect.Field;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

/**
 * On every test failure, writes two files under {@code build/reports/diagnostics/}:
 * <ul>
 *   <li>{@code <Class>.<method>.png} — full-page screenshot of what the browser
 *       was showing when the assertion blew up.</li>
 *   <li>{@code <Class>.<method>.txt} — a short, copy-pasteable diagnostic dump
 *       (current URL, document title, browser console errors, the first 50
 *       visible interactive elements, exception message). The text is shaped to
 *       hand directly to an AI chatbot: enough context to reason about the
 *       failure, no raw HTML.</li>
 * </ul>
 *
 * The "diagnostics" directory is inside {@code build/reports/} which the CI
 * workflow already uploads as the {@code e2e-test-reports} artifact, so no
 * extra workflow plumbing is needed.
 *
 * The listener reflects the {@code driver} field out of {@link BaseTest}; if a
 * test class doesn't extend BaseTest (or hasn't initialized the driver yet),
 * the dump is skipped silently — we never want diagnostics to themselves fail.
 */
public class FailureDiagnostics implements ITestListener {

    private static final Path OUT_DIR = Paths.get("build", "reports", "diagnostics");

    @Override
    public void onTestFailure(ITestResult result) {
        WebDriver driver = driverOf(result.getInstance());
        if (driver == null) return;

        String testName = sanitize(
                result.getTestClass().getName() + "." + result.getMethod().getMethodName());
        try {
            Files.createDirectories(OUT_DIR);
        } catch (IOException e) {
            return;
        }

        writeScreenshot(driver, OUT_DIR.resolve(testName + ".png"));
        writeDump(driver, result, OUT_DIR.resolve(testName + ".txt"), testName);
    }

    private void writeScreenshot(WebDriver driver, Path target) {
        try {
            byte[] png = ((TakesScreenshot) driver).getScreenshotAs(OutputType.BYTES);
            Files.write(target, png);
        } catch (Exception ignored) {
            // Driver may already be dead; nothing to do.
        }
    }

    private void writeDump(WebDriver driver, ITestResult result, Path target, String testName) {
        StringBuilder dump = new StringBuilder();
        dump.append("# ").append(testName).append("\n\n");

        // URL + title give the AI the routing context immediately ("we're on
        // /today but the test expected /settings" is a one-line giveaway).
        appendSafe(dump, "URL",   () -> driver.getCurrentUrl());
        appendSafe(dump, "Title", () -> driver.getTitle());
        dump.append("\n");

        appendConsoleLogs(driver, dump);
        appendInteractables(driver, dump);
        appendException(result, dump);

        try {
            Files.writeString(target, dump.toString());
        } catch (IOException ignored) {
            // Diagnostics are best-effort.
        }
    }

    private void appendConsoleLogs(WebDriver driver, StringBuilder dump) {
        try {
            List<LogEntry> logs = driver.manage().logs().get(LogType.BROWSER).getAll();
            if (logs.isEmpty()) return;
            dump.append("## Browser console (last 20)\n");
            int from = Math.max(0, logs.size() - 20);
            for (int i = from; i < logs.size(); i++) {
                LogEntry e = logs.get(i);
                dump.append("[").append(e.getLevel()).append("] ")
                        .append(e.getMessage()).append("\n");
            }
            dump.append("\n");
        } catch (Exception ignored) {
            // Some driver configurations don't expose browser logs.
        }
    }

    /**
     * Dumps the first 50 visible interactive elements as {@code tag.classes [text]}.
     * This is what gives the AI a concrete picture without dumping raw HTML —
     * enough to spot a missing button, an unexpected modal, or a redirect.
     */
    private void appendInteractables(WebDriver driver, StringBuilder dump) {
        try {
            String script =
                    "return Array.from(document.querySelectorAll(" +
                    "    'button, a[href], [role=button], input, .modal-title, .section-title, .page-tab'" +
                    "))" +
                    ".filter(e => {" +
                    "    const r = e.getBoundingClientRect();" +
                    "    return r.width > 0 && r.height > 0;" +
                    "})" +
                    ".slice(0, 50)" +
                    ".map(e => {" +
                    "    const cls = (typeof e.className === 'string' && e.className)" +
                    "        ? '.' + e.className.split(/\\s+/).filter(Boolean).slice(0, 3).join('.')" +
                    "        : '';" +
                    "    const id = e.id ? '#' + e.id : '';" +
                    "    const txt = (e.innerText || e.value || e.placeholder || '').trim().slice(0, 50);" +
                    "    return e.tagName.toLowerCase() + id + cls + (txt ? '  [' + txt + ']' : '');" +
                    "})" +
                    ".join('\\n');";
            Object result = ((JavascriptExecutor) driver).executeScript(script);
            if (result instanceof String && !((String) result).isEmpty()) {
                dump.append("## Visible interactives\n").append(result).append("\n\n");
            }
        } catch (Exception ignored) {
        }
    }

    private void appendException(ITestResult result, StringBuilder dump) {
        Throwable t = result.getThrowable();
        if (t == null) return;
        dump.append("## Exception\n");
        dump.append(t.getClass().getName());
        if (t.getMessage() != null) {
            String msg = t.getMessage().trim();
            // Selenium errors carry the entire Build info block; clip to keep the
            // dump scannable.
            int idx = msg.indexOf("Build info:");
            if (idx > 0) msg = msg.substring(0, idx).trim();
            dump.append(": ").append(msg);
        }
        dump.append("\n");
    }

    private void appendSafe(StringBuilder dump, String key, ThrowingSupplier<String> getter) {
        try {
            String v = getter.get();
            dump.append(key).append(": ").append(v == null ? "" : v).append("\n");
        } catch (Exception ignored) {
        }
    }

    /**
     * Walks the instance's class hierarchy looking for a {@code driver} field
     * (BaseTest declares it as protected). Reflection is used because TestNG's
     * {@link ITestResult#getInstance()} returns Object.
     */
    private WebDriver driverOf(Object instance) {
        if (instance == null) return null;
        Class<?> c = instance.getClass();
        while (c != null && c != Object.class) {
            try {
                Field f = c.getDeclaredField("driver");
                f.setAccessible(true);
                Object v = f.get(instance);
                if (v instanceof WebDriver) return (WebDriver) v;
            } catch (NoSuchFieldException ignored) {
                // Walk up.
            } catch (Exception ignored) {
                return null;
            }
            c = c.getSuperclass();
        }
        return null;
    }

    private String sanitize(String name) {
        return name.replaceAll("[^a-zA-Z0-9._-]", "_");
    }

    @FunctionalInterface
    private interface ThrowingSupplier<T> {
        T get() throws Exception;
    }
}
