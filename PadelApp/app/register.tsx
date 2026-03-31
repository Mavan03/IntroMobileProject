// Bestand: /app/register.tsx
import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";

export default function Register() {
  const router = useRouter();

  // State voor de input velden (Signals in Angular 17, useState in React)
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleRegister = async () => {
    // Basic validatie
    if (!firstName || !lastName || !email || !password) {
      setErrorMessage("Vul alle velden in a niffo!");
      return;
    }

    try {
      // 1. Maak account aan in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      // 2. Sla extra user data op in Firestore (users collectie)
      // We gebruiken de UID van auth als het document ID. Super clean.
      await setDoc(doc(db, "users", user.uid), {
        id: user.uid, // Je wilde een ID erbij, dit is de unieke ID van deze user!
        firstName: firstName,
        lastName: lastName,
        email: email,
        level: 1,
      });

      console.log("Account gefixt! ID:", user.uid);
      alert("Account succesvol aangemaakt!");

      // Stuur de broer terug naar het dashboard
      router.replace("/");
    } catch (error) {
      // De TypeScript fix: checken of het echt een Error object is
      if (error instanceof Error) {
        setErrorMessage(error.message);
        console.error("Ai, er ging iets mis:", error.message);
      } else {
        setErrorMessage("Onbekende fout opgetreden.");
      }
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Terug</Text>
        </TouchableOpacity>

        <Text style={styles.header}>Account Aanmaken</Text>

        {errorMessage !== "" && (
          <Text style={styles.errorText}>{errorMessage}</Text>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Voornaam:</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Bijv. Renzo"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Achternaam:</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Bijv. Bouchdig"
          />
        </View>

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

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Wachtwoord:</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Minimaal 6 tekens"
          />
        </View>

        <TouchableOpacity style={styles.button} onPress={handleRegister}>
          <Text style={styles.buttonText}>Registreer</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
  },
  header: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  errorText: {
    color: "red",
    backgroundColor: "#ffe6e6",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    fontWeight: "bold",
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: "#555",
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  button: {
    backgroundColor: "#4CAF50",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  backButton: {
    marginBottom: 20,
    paddingVertical: 10,
    alignSelf: "flex-start",
    marginTop: 30,
  },
  backButtonText: {
    color: "#007AFF",
    fontSize: 16,
    fontWeight: "bold",
  },
});
