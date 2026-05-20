plugins {
    java
}

group = "com.kavin.fitness"
version = "0.0.1-SNAPSHOT"

java {
    sourceCompatibility = JavaVersion.VERSION_21
    targetCompatibility = JavaVersion.VERSION_21
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("com.microsoft.playwright:playwright:1.52.0")
    testImplementation("org.testng:testng:7.10.2")
    testImplementation("org.slf4j:slf4j-simple:2.0.12")
}

// Download the Playwright-managed Chromium build and required system libs.
// Run once per CI cache miss before the test task.
tasks.register<JavaExec>("installPlaywright") {
    classpath = sourceSets["test"].runtimeClasspath
    mainClass.set("com.microsoft.playwright.CLI")
    args = listOf("install", "--with-deps", "chromium")
}

tasks.withType<Test> {
    useTestNG {
        suites("src/test/resources/testng-config.xml")
    }
    workingDir = projectDir

    listOf("env.baseurl", "env.apiurl", "test.user.username", "test.user.password", "headed").forEach { key ->
        System.getProperty(key)?.let { systemProperty(key, it) }
    }

    testLogging {
        showStandardStreams = true
        events("started", "passed", "failed", "skipped")
        exceptionFormat = org.gradle.api.tasks.testing.logging.TestExceptionFormat.FULL
    }

    addTestListener(object : TestListener {
        override fun beforeSuite(suite: TestDescriptor) {}
        override fun beforeTest(testDescriptor: TestDescriptor) {}
        override fun afterTest(testDescriptor: TestDescriptor, result: TestResult) {}
        override fun afterSuite(suite: TestDescriptor, result: TestResult) {
            if (suite.parent == null && result.testCount == 0L) {
                throw GradleException("No tests were executed.")
            }
        }
    })
}
