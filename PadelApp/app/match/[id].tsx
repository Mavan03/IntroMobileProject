import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { PADEL_CLUBS } from "../../data/clubs";

const parseDateToTime = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.match(/\d+/g);
  if (!parts || parts.length < 3) return 0;
  const day = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const year = parseInt(parts[2], 10);
  const hours = parts[3] ? parseInt(parts[3], 10) : 0;
  const minutes = parts[4] ? parseInt(parts[4], 10) : 0;
  return new Date(year, month, day, hours, minutes).getTime();
};

export default function MatchDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // State om bij te houden welke speler geselecteerd is om te wisselen
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(
    null,
  );

  useEffect(() => {
    const fetchMatch = async () => {
      const docSnap = await getDoc(doc(db, "matches", id as string));
      if (docSnap.exists()) {
        setMatch({ id: docSnap.id, ...docSnap.data() });
      }
      setLoading(false);
    };
    fetchMatch();
  }, [id]);

  const currentUser = auth.currentUser;
  const isParticipant =
    currentUser && match?.players?.includes(currentUser.uid);
  const isCreator = currentUser && match?.creatorId === currentUser.uid;
  const isFull = match?.players?.length === 4;
  const isPast = match ? parseDateToTime(match.date) < Date.now() : false;

  const handleJoin = async () => {
    if (!currentUser) return Alert.alert("Fout", "Je moet ingelogd zijn.");
    if (isParticipant) return Alert.alert("Info", "Je zit al in deze match.");
    if (isFull) return Alert.alert("Vol", "Deze match is al volzet.");

    try {
      await updateDoc(doc(db, "matches", match.id), {
        players: arrayUnion(currentUser.uid),
      });
      setMatch({ ...match, players: [...match.players, currentUser.uid] });
      Alert.alert("Succes", "Je bent toegevoegd aan de match!");
    } catch (e) {
      Alert.alert("Fout", "Kon niet deelnemen.");
    }
  };

  const handleLeave = async () => {
    if (Platform.OS === "web") {
      const confirmLeave = window.confirm(
        "Weet je zeker dat je je wilt uitschrijven?",
      );
      if (!confirmLeave) return;
      try {
        await updateDoc(doc(db, "matches", match.id), {
          players: arrayRemove(currentUser?.uid),
        });
        alert("Je bent uit de match gehaald.");
        router.replace("/");
      } catch (e) {
        alert("Fout bij verlaten.");
      }
    } else {
      Alert.alert(
        "Match Verlaten",
        "Weet je zeker dat je je wilt uitschrijven?",
        [
          { text: "Annuleren", style: "cancel" },
          {
            text: "Verlaten",
            style: "destructive",
            onPress: async () => {
              await updateDoc(doc(db, "matches", match.id), {
                players: arrayRemove(currentUser?.uid),
              });
              router.replace("/");
            },
          },
        ],
      );
    }
  };

  const handleShuffleTeams = async () => {
    if (!isFull)
      return Alert.alert(
        "Wacht even",
        "Je kunt pas teams maken als er 4 spelers zijn.",
      );
    const shuffled = [...match.players].sort(() => 0.5 - Math.random());
    try {
      await updateDoc(doc(db, "matches", match.id), { players: shuffled });
      setMatch({ ...match, players: shuffled });
      setSelectedSwapIndex(null); // Reset selectie bij shuffle
    } catch (e) {
      Alert.alert("Fout", "Kon teams niet opslaan.");
    }
  };

  // Handmatige wissel
  const handleSwapClick = async (index: number) => {
    if (!isCreator || !isFull) return; // Alleen beheerder mag dit

    if (selectedSwapIndex === null) {
      // Selecteer de eerste speler
      setSelectedSwapIndex(index);
    } else if (selectedSwapIndex === index) {
      // Klik je nog een keer op dezelfde -> Deselecteer.
      setSelectedSwapIndex(null);
    } else {
      // Wissel de twee spelers in de array
      const newPlayers = [...match.players];
      const temp = newPlayers[selectedSwapIndex];
      newPlayers[selectedSwapIndex] = newPlayers[index];
      newPlayers[index] = temp;

      try {
        await updateDoc(doc(db, "matches", match.id), { players: newPlayers });
        setMatch({ ...match, players: newPlayers });
        setSelectedSwapIndex(null); // Reset selectie na succesvolle wissel
      } catch (e) {
        Alert.alert("Fout", "Kon de handmatige teamindeling niet opslaan.");
      }
    }
  };

  const openRoute = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.club)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Fout", "Kon kaarten niet openen."),
    );
  };

  const handleBookDirectly = () => {
    const clubObj = PADEL_CLUBS.find((c: any) => c.name === match.club);
    if (clubObj)
      router.push(`/bookdetail/${clubObj.id}?matchId=${match.id}` as any);
    else router.push("/book-court" as any);
  };

  // Hulpfunctie voor weergave van spelers
  const getPlayerDisplay = (index: number) => {
    if (!match?.players || !match.players[index]) return "Wachten...";
    const uid = match.players[index];
    if (uid === currentUser?.uid) return "Jij (Beheerder)";
    return `Speler (${uid.substring(0, 4)})`;
  };

  // Design voor één speler-blokje (Klikbaar voor de admin)
  const renderPlayer = (index: number) => {
    const isSelected = selectedSwapIndex === index;
    return (
      <TouchableOpacity
        activeOpacity={isCreator ? 0.6 : 1}
        disabled={!isCreator}
        onPress={() => handleSwapClick(index)}
        style={[styles.playerItemBox, isSelected && styles.selectedPlayerBox]}
      >
        <Text
          style={[
            styles.playerItemText,
            isSelected && styles.selectedPlayerText,
          ]}
        >
          👤 {getPlayerDisplay(index)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  if (!match)
    return (
      <View style={styles.center}>
        <Text>Match niet gevonden.</Text>
      </View>
    );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Terug</Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.clubName}>{match.club}</Text>
        <Text style={styles.dateText}>📅 {match.date}</Text>
        <Text style={styles.levelText}>
          Niveau: {match.minLevel} - {match.maxLevel}
        </Text>
        <Text style={styles.typeText}>
          {match.isCompetitive ? "Competitief" : "Recreatief"}
        </Text>

        <TouchableOpacity style={styles.routeBtn} onPress={openRoute}>
          <Text style={styles.routeBtnText}>📍 Bekijk Route</Text>
        </TouchableOpacity>

        <View style={styles.separator} />

        <View style={styles.headerRow}>
          <View>
            <Text style={styles.sectionTitle}>
              Spelers ({match.players?.length || 0}/4)
            </Text>
            {/* Kleine tekst voor de admin */}
            {isCreator && isFull && (
              <Text style={styles.hintText}>
                Tik op 2 spelers om ze te wisselen
              </Text>
            )}
          </View>

          {isCreator && isFull && (
            <TouchableOpacity
              onPress={handleShuffleTeams}
              style={styles.shuffleBtn}
            >
              <Text style={styles.shuffleBtnText}>🔀 Mix Teams</Text>
            </TouchableOpacity>
          )}
        </View>

        {isFull ? (
          <View style={styles.teamsContainer}>
            <View style={styles.teamBox}>
              <Text style={styles.teamTitle}>Team 1</Text>
              {renderPlayer(0)}
              {renderPlayer(1)}
            </View>
            <View style={styles.vsBox}>
              <Text style={styles.vsText}>VS</Text>
            </View>
            <View style={styles.teamBox}>
              <Text style={styles.teamTitle}>Team 2</Text>
              {renderPlayer(2)}
              {renderPlayer(3)}
            </View>
          </View>
        ) : (
          <View style={styles.waitingBox}>
            <Text style={styles.waitingText}>Wachten op meer spelers...</Text>
            {/* Toon alvast de spelers die er wél zijn */}
            {match.players?.map((p: string, idx: number) => (
              <Text key={p} style={{ marginTop: 5, color: "#666" }}>
                👤 {getPlayerDisplay(idx)}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.separator} />

        <View style={styles.actionContainer}>
          {!isParticipant && !isFull && (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleJoin}>
              <Text style={styles.primaryBtnText}>Deelnemen aan match</Text>
            </TouchableOpacity>
          )}

          {isParticipant && (
            <View style={styles.rowBtns}>
              <TouchableOpacity
                style={[styles.halfBtn, styles.chatBtn]}
                onPress={() => router.push(`/chat/${match.id}` as any)}
              >
                <Text style={styles.btnTextWhite}>Chat</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.halfBtn, styles.leaveBtn]}
                onPress={handleLeave}
              >
                <Text style={styles.btnTextWhite}>Verlaten</Text>
              </TouchableOpacity>
            </View>
          )}

          {isFull && !match.isBooked && (
            <View style={styles.alertBox}>
              <Text style={styles.alertText}>
                De match is vol! Tijd om een veld te reserveren bij {match.club}
                .
              </Text>
              <TouchableOpacity
                style={styles.bookBtn}
                onPress={handleBookDirectly}
              >
                <Text style={styles.bookBtnText}>Veld Boeken</Text>
              </TouchableOpacity>
            </View>
          )}

          {isCreator &&
            isFull &&
            match.isBooked &&
            isPast &&
            match.status !== "played" && (
              <TouchableOpacity
                style={styles.adminBtn}
                onPress={() => router.push(`/match-result/${match.id}` as any)}
              >
                <Text style={styles.adminBtnText}>Resultaat invoeren</Text>
              </TouchableOpacity>
            )}

          {match.status === "played" && (
            <View style={styles.playedBox}>
              <Text style={styles.playedText}>Uitslag: {match.score}</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA", padding: 20 },
  backBtn: { marginTop: 40, marginBottom: 15 },
  backBtnText: { color: "#007AFF", fontSize: 16, fontWeight: "bold" },
  card: {
    backgroundColor: "#fff",
    padding: 25,
    borderRadius: 20,
    elevation: 3,
    marginBottom: 40,
  },
  clubName: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 10,
    color: "#1A1A1A",
  },
  dateText: {
    fontSize: 16,
    color: "#007AFF",
    marginBottom: 5,
    fontWeight: "600",
  },
  levelText: { fontSize: 14, color: "#666" },
  typeText: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 5,
    color: "#4CAF50",
  },
  routeBtn: {
    alignSelf: "flex-start",
    marginTop: 15,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
  },
  routeBtnText: { color: "#2196F3", fontWeight: "bold" },
  separator: { height: 1, backgroundColor: "#eee", marginVertical: 20 },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold" },
  hintText: {
    fontSize: 12,
    color: "#007AFF",
    marginTop: 2,
    fontStyle: "italic",
  },
  shuffleBtn: {
    backgroundColor: "#F0F0F0",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  shuffleBtnText: { color: "#333", fontSize: 12, fontWeight: "bold" },

  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#FAFAFA",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  teamBox: { flex: 1 },
  teamTitle: {
    fontWeight: "900",
    color: "#4CAF50",
    marginBottom: 10,
    fontSize: 16,
  },

  // Nieuwe stijlen voor de klikbare spelers
  playerItemBox: {
    padding: 8,
    backgroundColor: "#fff",
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#eee",
  },
  selectedPlayerBox: { borderColor: "#007AFF", backgroundColor: "#E3F2FD" },
  playerItemText: { color: "#555", fontSize: 14, fontWeight: "500" },
  selectedPlayerText: { color: "#007AFF", fontWeight: "bold" },

  vsBox: { paddingHorizontal: 15 },
  vsText: { fontWeight: "900", color: "#CCC", fontSize: 18 },

  waitingBox: {
    backgroundColor: "#FFF3E0",
    padding: 15,
    borderRadius: 10,
    alignItems: "flex-start",
  },
  waitingText: { color: "#FF9800", fontWeight: "bold", marginBottom: 5 },

  actionContainer: { marginTop: 15 },
  primaryBtn: {
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  rowBtns: { flexDirection: "row", justifyContent: "space-between" },
  halfBtn: { flex: 0.48, padding: 15, borderRadius: 12, alignItems: "center" },
  chatBtn: { backgroundColor: "#9C27B0" },
  leaveBtn: { backgroundColor: "#FF3B30" },
  btnTextWhite: { color: "#FFF", fontWeight: "bold", fontSize: 15 },

  alertBox: {
    backgroundColor: "#E8F5E9",
    padding: 15,
    borderRadius: 12,
    marginTop: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#C8E6C9",
  },
  alertText: {
    color: "#2E7D32",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  bookBtn: {
    backgroundColor: "#4CAF50",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  bookBtnText: { color: "#FFF", fontWeight: "bold" },

  adminBtn: {
    backgroundColor: "#333",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 15,
  },
  adminBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },

  playedBox: {
    backgroundColor: "#f0f0f0",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    alignItems: "center",
  },
  playedText: { fontWeight: "bold", color: "#333", fontSize: 16 },

  center: { flex: 1, justifyContent: "center", alignItems: "center" },
});
