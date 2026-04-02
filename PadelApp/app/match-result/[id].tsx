import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, increment } from "firebase/firestore";
import { db } from "../../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function MatchResult() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [s1T1, setS1T1] = useState("");
  const [s1T2, setS1T2] = useState("");
  const [s2T1, setS2T1] = useState("");
  const [s2T2, setS2T2] = useState("");
  const [s3T1, setS3T1] = useState("");
  const [s3T2, setS3T2] = useState("");

  useEffect(() => {
    const fetchMatch = async () => {
      const docSnap = await getDoc(doc(db, "matches", id as string));
      if (docSnap.exists()) setMatch({ id: docSnap.id, ...docSnap.data() });
      setLoading(false);
    };
    fetchMatch();
  }, [id]);

  const handleSaveResult = async () => {
    if (!s1T1 || !s1T2 || !s2T1 || !s2T2) {
      Alert.alert("Fout", "Vul minstens de eerste twee sets in.");
      return;
    }
    setIsSaving(true);
    try {
      let t1Sets = 0;
      let t2Sets = 0;
      if (parseInt(s1T1) > parseInt(s1T2)) t1Sets++;
      else t2Sets++;
      if (parseInt(s2T1) > parseInt(s2T2)) t1Sets++;
      else t2Sets++;
      if (s3T1 && s3T2) {
        if (parseInt(s3T1) > parseInt(s3T2)) t1Sets++;
        else t2Sets++;
      }

      const winner = t1Sets > t2Sets ? "team1" : "team2";
      const team1Ids = [match.players[0], match.players[1]];
      const team2Ids = [match.players[2], match.players[3]];

      await updateDoc(doc(db, "matches", id as string), {
        status: "played",
        score: `${s1T1}-${s1T2}, ${s2T1}-${s2T2}${s3T1 ? `, ${s3T1}-${s3T2}` : ""}`,
        winner: winner,
      });

      if (match.isCompetitive) {
        const winners = winner === "team1" ? team1Ids : team2Ids;
        const losers = winner === "team1" ? team2Ids : team1Ids;
        for (const uid of winners) {
          if (uid)
            await updateDoc(doc(db, "users", uid), { level: increment(0.15) });
        }
        for (const uid of losers) {
          if (uid)
            await updateDoc(doc(db, "users", uid), { level: increment(-0.1) });
        }
      }

      Alert.alert("Succes", "Resultaat opgeslagen en levels geüpdatet!");
      router.replace("/");
    } catch (e) {
      Alert.alert("Fout", "Opslaan mislukt.");
    } finally {
      setIsSaving(false);
    }
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.title}>Uitslag invoeren</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoRow}>
              <Ionicons name="tennisball" size={18} color="#00E676" />
              <Text style={styles.matchInfo}>{match.club}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="calendar" size={18} color="#94A3B8" />
              <Text style={styles.matchInfo}>{match.date}</Text>
            </View>

            <View style={styles.separator} />

            <View style={styles.tableHeader}>
              <Text style={styles.teamCol}>Teams</Text>
              <Text style={styles.setCol}>Set 1</Text>
              <Text style={styles.setCol}>Set 2</Text>
              <Text style={styles.setCol}>Set 3</Text>
            </View>

            <View style={styles.row}>
              <Text style={styles.teamName}>Team 1</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s1T1}
                onChangeText={setS1T1}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s2T1}
                onChangeText={setS2T1}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s3T1}
                onChangeText={setS3T1}
                placeholder="-"
                placeholderTextColor="#64748B"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.teamName}>Team 2</Text>
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s1T2}
                onChangeText={setS1T2}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s2T2}
                onChangeText={setS2T2}
                placeholder="0"
                placeholderTextColor="#64748B"
              />
              <TextInput
                style={styles.scoreInput}
                keyboardType="number-pad"
                returnKeyType="done"
                value={s3T2}
                onChangeText={setS3T2}
                placeholder="-"
                placeholderTextColor="#64748B"
              />
            </View>

            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.disabled]}
              onPress={handleSaveResult}
              disabled={isSaving}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? "Verwerken..." : "Uitslag opslaan"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617", paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 60,
    marginBottom: 24,
  },
  backBtn: { marginRight: 15 },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: "#1E293B",
    padding: 24,
    borderRadius: 24,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    justifyContent: "center",
  },
  matchInfo: {
    textAlign: "center",
    color: "#F8FAFC",
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 16,
  },
  separator: { height: 1, backgroundColor: "#334155", marginVertical: 20 },
  tableHeader: { flexDirection: "row", marginBottom: 16 },
  teamCol: { flex: 2, fontWeight: "900", color: "#F8FAFC", fontSize: 15 },
  setCol: {
    flex: 1,
    textAlign: "center",
    fontWeight: "800",
    color: "#94A3B8",
    fontSize: 13,
    textTransform: "uppercase",
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 16 },
  teamName: { flex: 2, fontWeight: "800", color: "#E2E8F0", fontSize: 16 },
  scoreInput: {
    flex: 1,
    backgroundColor: "#0F172A",
    marginHorizontal: 4,
    paddingVertical: 12,
    borderRadius: 12,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#334155",
    color: "#F8FAFC",
    fontWeight: "900",
    fontSize: 18,
  },
  saveBtn: {
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  saveBtnText: { color: "#0F172A", fontWeight: "900", fontSize: 16 },
  disabled: { opacity: 0.7 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
});
