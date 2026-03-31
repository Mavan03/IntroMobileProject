import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../config/firebaseConfig";

export default function Login() {
  const router = useRouter();

  // State voor de input velden
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleLogin = async () => {
    // Basic validatie
    if (!email || !password) {
      setErrorMessage("Vul je email en wachtwoord in!");
      return;
    }

    setIsLoading(true);
    setErrorMessage("");

    try {
      // Firebase Magie: Controleer of het account bestaat en het wachtwoord klopt
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password,
      );

      console.log("Ingelogd als baas! ID:", userCredential.user.uid);

      // Stuur de broer terug naar het dashboard
      router.replace("/");
    } catch (error) {
      // Firebase geeft specifieke errors terug als het misgaat
      if (error instanceof Error) {
        console.error("Login fout:", error.message);
        // We maken de error iets gebruiksvriendelijker dan de standaard Firebase Engelse tekst
        setErrorMessage(
          "Verkeerd emailadres of wachtwoord. Probeer het opnieuw!",
        );
      } else {
        setErrorMessage("Onbekende fout opgetreden bij het inloggen.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        {/* Terug Knop */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>

        <Text style={styles.header}>Welkom terug!</Text>
        <Text style={styles.subtitle}>
          Log in om je padel matches te beheren.
        </Text>

        {/* Error Melding */}
        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        {/* Email Veld */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email:</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="naam@email.com"
          />
        </View>

        {/* Wachtwoord Veld */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Wachtwoord:</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Jouw geheime wachtwoord"
          />
        </View>

        {/* Login Knop */}
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Inloggen</Text>
          )}
        </TouchableOpacity>

        {/* Link naar Registreren (voor als ze toch geen account hebben) */}
        <View style={styles.registerContainer}>
          <Text style={styles.registerText}>Nog geen account? </Text>
          <TouchableOpacity onPress={() => router.push("/register" as any)}>
            <Text style={styles.registerLink}>Maak er één aan!</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
    justifyContent: "center", // Zet alles mooi in het midden van het scherm
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    paddingVertical: 10,
    zIndex: 10,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  header: {
    fontSize: 32,
    fontWeight: "900",
    marginBottom: 5,
    color: "#1a1a1a",
    marginTop: 40,
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 30,
  },
  errorText: {
    color: "#D8000C",
    backgroundColor: "#FFD2D2",
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    fontWeight: "600",
    overflow: "hidden",
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    marginBottom: 8,
    color: "#555",
    fontWeight: "700",
  },
  input: {
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    backgroundColor: "#FAFAFA",
    color: "#333",
  },
  button: {
    backgroundColor: "#007AFF", // Mooi blauw om in de style te blijven
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonDisabled: {
    backgroundColor: "#A0CFFF", // Lichter blauw als hij aan het laden is
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  registerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 30,
  },
  registerText: {
    color: "#666",
    fontSize: 15,
  },
  registerLink: {
    color: "#007AFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
