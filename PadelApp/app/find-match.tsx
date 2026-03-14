import { useRouter } from "expo-router";
import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db, auth } from "../config/firebaseConfig";

export default function FindMatch() {
  const router = useRouter();
  const currentUser = auth.currentUser;

  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // wedstrijden op halen
  const fetchMatches = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "matches"));
      const matchesData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMatches(matchesData);
    } catch (error) {
      console.error("Fout bij het ophalen van matches:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleJoinMatch = async (matchId: string, playersArray: string[]) => {
    if (!currentUser) {
      Alert.alert("Je moet ingelogd zijn om mee te doen!");
      return;
    }

    if (playersArray && playersArray.includes(currentUser.uid)) {
      Alert.alert("Je doet al mee aan deze wedstrijd!");
      return;
    }

    if (playersArray && playersArray.length >= 4) {
      Alert.alert("Deze wedstrijd is al vol!");
      return;
    }

    try {
      const matchRef = doc(db, "matches", matchId);
      await updateDoc(matchRef, {
        players: arrayUnion(currentUser.uid),
      });

      Alert.alert(
        "Succes!",
        "Betaling gedaan! Je bent succesvol ingeschreven.",
      );

      if (playersArray && playersArray.length === 3) {
        Alert.alert(
          "Voltooid!",
          "Jullie zijn met z'n vieren. De wedstrijd gaat definitief door!",
        );
      }

      fetchMatches();
    } catch (error) {
      console.error("Fout bij inschrijven:", error);
      Alert.alert("Fout", "Er ging iets mis bij het inschrijven.");
    }
  };

  // Logica voor de Info pop-up
  const showMatchInfo = (item: any) => {
    Alert.alert(
      "Wedstrijd Details",
      `Club: ${item.club}\nDatum: ${item.date}\nNiveau: ${item.minLevel} tot ${item.maxLevel}\nGemengd: ${item.isMixed ? "Ja" : "Nee"}\nCompetitief: ${item.isCompetitive ? "Ja" : "Nee"}`,
    );
  };

  //  Het ontwerpen van 1 kaartje in de lijst
  const renderMatchCard = ({ item }: { item: any }) => {
    const playerCount = item.players ? item.players.length : 0;
    const isAlreadyJoined =
      currentUser && item.players && item.players.includes(currentUser.uid);
    const isFull = playerCount >= 4;

    let joinBtnText = "Meedoen";
    let joinBtnStyle = styles.joinButton;
    let disabled = false;

    if (isAlreadyJoined) {
      joinBtnText = "Ingeschreven ✓";
      joinBtnStyle = styles.joinedButton;
      disabled = true;
    } else if (isFull) {
      joinBtnText = "Vol";
      joinBtnStyle = styles.fullButton;
      disabled = true;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.clubName}>{item.club}</Text>
        <Text style={styles.matchInfo}>Datum: {item.date}</Text>
        <Text style={styles.matchInfo}>
          Niveau: {item.minLevel} - {item.maxLevel}
        </Text>

        <Text style={styles.playerCount}>Spelers: {playerCount} / 4</Text>

        {/* De rij met 3 knoppen naast elkaar */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.actionButton, joinBtnStyle]}
            disabled={disabled}
            onPress={() => handleJoinMatch(item.id, item.players || [])}
          >
            <Text style={styles.actionButtonText}>{joinBtnText}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.infoButton]}
            onPress={() => showMatchInfo(item)}
          >
            <Text style={styles.actionButtonText}>Info</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.chatButton]}
            onPress={() => router.push(`/match/${item.id}` as any)}
          >
            <Text style={styles.actionButtonText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Terug</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Zoek een Wedstrijd</Text>

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchCard}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={styles.emptyText}>
              Er zijn nog geen open matches gevonden.
            </Text>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5", padding: 20 },
  header: { fontSize: 24, fontWeight: "bold", marginBottom: 20, color: "#333" },
  card: {
    backgroundColor: "#fff",
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  clubName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
    color: "#2196F3",
  },
  matchInfo: { fontSize: 14, color: "#555", marginBottom: 3 },
  playerCount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4CAF50",
    marginTop: 5,
    marginBottom: 10,
  },

  // Nieuwe stijlen voor de rij met knoppen
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#eee",
    paddingTop: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    marginHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: { color: "#fff", fontWeight: "bold", fontSize: 13 },

  // Specifieke kleuren voor de knoppen
  joinButton: { backgroundColor: "#007AFF" },
  joinedButton: { backgroundColor: "#4CAF50" },
  fullButton: { backgroundColor: "#ccc" },
  infoButton: { backgroundColor: "#FF9800" },
  chatButton: { backgroundColor: "#9C27B0" },

  emptyText: {
    textAlign: "center",
    color: "#888",
    marginTop: 20,
    fontSize: 16,
  },
  backButton: {
    marginBottom: 10,
    paddingVertical: 10,
    alignSelf: "flex-start",
  },
  backButtonText: { color: "#007AFF", fontSize: 16, fontWeight: "bold" },
});
