# ---- Build stage ----
# gradle:8.6-jdk21 runs as the 'gradle' user — use its home dir to avoid permission errors
FROM gradle:8.6-jdk21 AS build

WORKDIR /home/gradle/app

# Copy build files with correct ownership
COPY --chown=gradle:gradle build.gradle.kts settings.gradle.kts ./
COPY --chown=gradle:gradle src ./src

RUN gradle bootJar --no-daemon

# ---- Run stage ----
FROM eclipse-temurin:21-jre-jammy

WORKDIR /app
COPY --from=build /home/gradle/app/build/libs/*.jar app.jar

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]