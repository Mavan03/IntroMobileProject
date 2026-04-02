import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function SelectMatch() {
  const router = useRouter();
  const { clubName } = useLocalSearchParams();
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchMyMatches = async () => {
      if (!auth.currentUser) {
        Alert.alert("Niet ingelogd", "Log in om je matchen te zien.");
        setIsLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, "matches"),
          where("club", "==", clubName),
        );
        const querySnapshot = await getDocs(q);
        const allMatchesAtClub: any[] = [];
        querySnapshot.forEach((doc) =>
          allMatchesAtClub.push({ id: doc.id, ...doc.data() }),
        );

        const myFilteredMatches = allMatchesAtClub.filter(
          (match) =>
            match.creatorId === auth.currentUser?.uid ||
            (match.players && match.players.includes(auth.currentUser?.uid)),
        );
        setMyMatches(myFilteredMatches);
      } catch (error) {
        Alert.alert("Fout", "Kon matchen niet ophalen.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchMyMatches();
  }, [clubName]);

  const handleBookCourt = (match: any) => {
    Alert.alert(
      "Veld Gereserveerd!",
      `Je hebt succesvol een veld geboekt bij ${clubName} voor de match op ${match.date}.`,
      [{ text: "Top!", onPress: () => router.push("/") }],
    );
  };

  const renderMatchCard = ({ item }: { item: any }) => (
    <View style={styles.matchCard}>
      <View style={styles.matchInfo}>
        <View style={styles.dateRow}>
          <Ionicons name="calendar" size={18} color="#94A3B8" />
          <Text style={styles.matchDate}>{item.date}</Text>
        </View>
        <Text style={styles.matchLevel}>
          Niveau: {item.minLevel} - {item.maxLevel}
        </Text>
        <Text style={styles.matchType}>
          {item.isCompetitive ? "Competitief" : "Recreatief"} •{" "}
          {item.isMixed ? "Gemengd" : "M/V"}
        </Text>
      </View>
      <TouchableOpacity
        style={styles.bookButton}
        onPress={() => handleBookCourt(item)}
      >
        <Text style={styles.bookButtonText}>Boek Veld</Text>
        <Ionicons
          name="arrow-forward"
          size={18}
          color="#0F172A"
          style={{ marginLeft: 6 }}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Matchen bij {clubName}
        </Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00E676" />
          <Text style={styles.loadingText}>Jouw matchen ophalen...</Text>
        </View>
      ) : myMatches.length === 0 ? (
        <View style={styles.center}>
          <Ionicons
            name="tennisball-outline"
            size={64}
            color="#334155"
            style={{ marginBottom: 20 }}
          />
          <Text style={styles.noMatchesTitle}>Geen matchen gevonden</Text>
          <Text style={styles.noMatchesText}>
            Je hebt nog geen match gepland bij {clubName} waar je aan meedoet.
          </Text>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => router.push("/create-match" as any)}
          >
            <Text style={styles.createButtonText}>Maak een match aan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={myMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          contentContainerStyle={styles.listContainer}
          bounces={false}
          overScrollMode="never"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    backgroundColor: "#0F172A",
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backButton: { marginRight: 15 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    flex: 1,
    letterSpacing: -0.5,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "600",
  },
  noMatchesTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 10,
  },
  noMatchesText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 30,
    fontWeight: "500",
    lineHeight: 22,
  },
  createButton: {
    backgroundColor: "#00E676",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 16,
    elevation: 4,
    shadowColor: "#00E676",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  createButtonText: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
  listContainer: { padding: 20 },
  matchCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#334155",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  matchInfo: { marginBottom: 16 },
  dateRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  matchDate: {
    fontSize: 18,
    fontWeight: "900",
    color: "#F8FAFC",
    marginLeft: 8,
  },
  matchLevel: {
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 4,
    fontWeight: "700",
  },
  matchType: { fontSize: 13, color: "#00E676", fontWeight: "800" },
  bookButton: {
    flexDirection: "row",
    backgroundColor: "#00E676",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bookButtonText: { color: "#0F172A", fontSize: 16, fontWeight: "900" },
});
