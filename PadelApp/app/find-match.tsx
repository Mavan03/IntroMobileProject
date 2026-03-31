import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { collection, getDocs } from "firebase/firestore";
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
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const formatTimeWithoutSeconds = (dateStr: string) => {
    const parts = dateStr.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : dateStr;
  };

  const fetchMatches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "matches"));
      const matchesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      //Filter volle matchen
      const openMatches = matchesData.filter((m: any) => {
        const playerCount = m.players ? m.players.length : 0;
        return playerCount < 4; // alleen zien als er minder dan 4 spelers zijn
      });

      const sorted = openMatches.sort(
        (a: any, b: any) => parseDateToTime(a.date) - parseDateToTime(b.date),
      );
      setMatches(sorted);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const renderMatchCard = ({ item }: { item: any }) => {
    const playerCount = item.players ? item.players.length : 0;
    const isFull = playerCount >= 4;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.clubName}>{item.club}</Text>
          <View
            style={[styles.badge, isFull ? styles.badgeFull : styles.badgeOpen]}
          >
            <Text style={styles.badgeText}>{isFull ? "VOL" : "OPEN"}</Text>
          </View>
        </View>

        <Text style={styles.matchInfo}>
          📅 {formatTimeWithoutSeconds(item.date)}
        </Text>
        <Text style={styles.matchInfo}>
          Niveau: {item.minLevel} - {item.maxLevel}
        </Text>
        <Text style={styles.playerCount}>Spelers: {playerCount} / 4</Text>

        <TouchableOpacity
          style={styles.detailsBtn}
          onPress={() => router.push(`/match/${item.id}` as any)}
        >
          <Text style={styles.detailsBtnText}>
            Bekijk Details & Inschrijven
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← Terug</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Zoek een Wedstrijd</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa", padding: 20 },
  header: { fontSize: 28, fontWeight: "900", marginBottom: 20, marginTop: 10 },
  back: { marginTop: 30, marginBottom: 10 },
  backText: { color: "#007AFF", fontWeight: "bold" },
  card: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 16,
    marginBottom: 15,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  clubName: { fontSize: 18, fontWeight: "bold" },
  matchInfo: { fontSize: 14, color: "#666", marginBottom: 4 },
  playerCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 5,
    marginBottom: 15,
  },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeOpen: { backgroundColor: "#E8F5E9" },
  badgeFull: { backgroundColor: "#FFEBEE" },
  badgeText: { fontSize: 10, fontWeight: "bold" },
  detailsBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  detailsBtnText: { color: "#fff", fontWeight: "bold" },
});
