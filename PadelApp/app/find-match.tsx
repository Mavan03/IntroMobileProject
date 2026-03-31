import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { collection, getDocs, doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";

const parseDateToTime = (dateStr: string) => {
  const parts = dateStr.match(/\d+/g);
  if (!parts || parts.length < 3) return 0;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1; 
  const year = parseInt(parts[2], 10);
  const hours = parts[3] ? parseInt(parts[3], 10) : 0;
  const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
  return new Date(year, month, day, hours, minutes).getTime();
};

export default function FindMatch() {
  const router = useRouter();
  const currentUser = auth.currentUser;
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const formatTimeWithoutSeconds = (dateStr: string) => {
    const parts = dateStr.split(':');
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : dateStr;
  };

  const fetchMatches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "matches"));
      const matchesData = querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      const sorted = matchesData.sort((a: any, b: any) => parseDateToTime(a.date) - parseDateToTime(b.date));
      setMatches(sorted);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMatches(); }, []);

  const renderMatchCard = ({ item }: { item: any }) => {
    const playerCount = item.players ? item.players.length : 0;
    return (
      <View style={styles.card}>
        <Text style={styles.clubName}>{item.club}</Text>
        <Text style={styles.matchInfo}>📅 {formatTimeWithoutSeconds(item.date)}</Text>
        <Text style={styles.matchInfo}>🎾 Niveau: {item.minLevel} - {item.maxLevel}</Text>
        <Text style={styles.playerCount}>Spelers: {playerCount} / 4</Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.btn, styles.joinBtn]} onPress={() => Alert.alert("Join", "Je doet mee!")}>
            <Text style={styles.btnText}>Meedoen</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.btn, styles.chatBtn]} onPress={() => router.push(`/match/${item.id}`)}>
            <Text style={styles.btnText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}><Text style={styles.backText}>← Terug</Text></TouchableOpacity>
      <Text style={styles.header}>Zoek een Wedstrijd</Text>
      {loading ? <ActivityIndicator size="large" color="#007AFF" /> : (
        <FlatList data={matches} keyExtractor={(item) => item.id} renderItem={renderMatchCard} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  header: { fontSize: 28, fontWeight: "900", marginBottom: 20, marginTop: 10 },
  back: { marginTop: 30, marginBottom: 10 },
  backText: { color: "#007AFF", fontWeight: "bold" },
  card: { backgroundColor: "#fff", padding: 18, borderRadius: 16, marginBottom: 15, elevation: 3 },
  clubName: { fontSize: 18, fontWeight: "bold", marginBottom: 8 },
  matchInfo: { fontSize: 14, color: "#666", marginBottom: 4 },
  playerCount: { fontSize: 14, fontWeight: "bold", color: "#4CAF50", marginTop: 5, marginBottom: 12 },
  buttonRow: { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: "#eee", paddingTop: 12 },
  btn: { flex: 1, paddingVertical: 10, borderRadius: 10, marginHorizontal: 4, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "bold" },
  joinBtn: { backgroundColor: "#007AFF" },
  chatBtn: { backgroundColor: "#9C27B0" }
});