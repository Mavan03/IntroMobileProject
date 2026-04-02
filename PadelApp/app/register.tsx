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
  Alert,
  TouchableWithoutFeedback,
  Keyboard,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function Register() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [lastName, setLastName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleRegister = async () => {
    if (!email || !password || !firstName || !lastName) {
      setErrorMessage("Vul alle velden in.");
      return;
    }
    setIsLoading(true);
    setErrorMessage("");

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password,
      );
      const user = userCredential.user;

      await setDoc(doc(db, "users", user.uid), {
        firstName,
        lastName,
        email,
        level: 1.5,
        profilePic: "https://cdn-icons-png.flaticon.com/512/3940/3940403.png",
        createdAt: new Date().getTime(),
        matchesWon: 0,
        matchesLost: 0,
      });

      Alert.alert("Succes", "Je account is aangemaakt!");
      router.replace("/");
    } catch (error: any) {
      setErrorMessage("Registratie mislukt. Controleer je gegevens.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.darkHeader}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Maak een account</Text>
            <Text style={styles.headerSubtitle}>
              Start vandaag nog met spelen
            </Text>
          </View>

          <View style={styles.card}>
            {errorMessage !== "" && (
              <View style={styles.errorBox}>
                <Ionicons name="warning" size={20} color="#FFF" />
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 0.48 }]}>
                <Text style={styles.label}>Voornaam</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="Bijv. Renzo"
                  placeholderTextColor="#64748B"
                />
              </View>
              <View style={[styles.inputGroup, { flex: 0.48 }]}>
                <Text style={styles.label}>Achternaam</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Bijv. Bouchdig"
                  placeholderTextColor="#64748B"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>E-mailadres</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="naam@email.com"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Wachtwoord</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Minimaal 6 tekens"
                placeholderTextColor="#64748B"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#0F172A" />
              ) : (
                <Text style={styles.buttonText}>Registreer</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, backgroundColor: "#020617", paddingBottom: 40 },
  darkHeader: {
    backgroundColor: "#0F172A",
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 24,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  backButton: { marginBottom: 20, alignSelf: "flex-start" },
  headerTitle: {
    fontSize: 32,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "#94A3B8",
    marginTop: 8,
    fontWeight: "500",
  },
  card: {
    backgroundColor: "#1E293B",
    marginHorizontal: 20,
    marginTop: -50,
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  errorText: { color: "#FFF", fontWeight: "700", marginLeft: 8, flex: 1 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 13, marginBottom: 8, color: "#94A3B8", fontWeight: "800" },
  input: {
    backgroundColor: "#0F172A",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#F8FAFC",
    fontWeight: "600",
  },
  button: {
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 10,
    elevation: 4,
    shadowColor: "#00E676",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonDisabled: { opacity: 0.7, elevation: 0, shadowOpacity: 0 },
  buttonText: { color: "#0F172A", fontSize: 18, fontWeight: "900" },
});
