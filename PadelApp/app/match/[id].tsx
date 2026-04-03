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
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  query,
  collection,
  where,
  getDocs,
  deleteDoc,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

const parseDateToTime = (dateStr: string) => {
  if (!dateStr) return 0;
  const parts = dateStr.match(/\d+/g);
  if (!parts || parts.length < 3) return 0;
  const day = parseInt(parts[0], 10),
    month = parseInt(parts[1], 10) - 1,
    year = parseInt(parts[2], 10);
  const hours = parts[3] ? parseInt(parts[3], 10) : 0,
    minutes = parts[4] ? parseInt(parts[4], 10) : 0;
  return new Date(year, month, day, hours, minutes).getTime();
};

export default function MatchDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [match, setMatch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedSwapIndex, setSelectedSwapIndex] = useState<number | null>(
    null,
  );
  const [playerNames, setPlayerNames] = useState<{ [key: string]: string }>({});

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  useEffect(() => {
    const fetchMatch = async () => {
      const docSnap = await getDoc(doc(db, "matches", id as string));
      if (docSnap.exists()) {
        const matchData = { id: docSnap.id, ...docSnap.data() } as any;
        setMatch(matchData);

        if (matchData.players) {
          const names: { [key: string]: string } = {};
          const playersArray = matchData.players as string[];
          for (const uid of playersArray) {
            try {
              const userDoc = await getDoc(doc(db, "users", uid));
              names[uid] = userDoc.exists()
                ? userDoc.data().firstName
                : "Onbekend";
            } catch (e) {
              names[uid] = "Speler";
            }
          }
          setPlayerNames(names);
        }
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
  const hasEnoughPlayersToConfirm = match?.players?.length >= 2;
  const isPast = match ? parseDateToTime(match.date) < Date.now() : false;

  const getPlayerDisplay = (index: number) => {
    if (!match?.players || !match.players[index]) {
      return match?.isBooked
        ? "Vrijgehouden (Betaald)"
        : "Wachten op speler...";
    }

    const uid = match.players[index];
    const displayName = playerNames[uid] ? playerNames[uid] : "Laden...";

    if (uid === match?.creatorId) {
      return uid === currentUser?.uid
        ? "Jij (Beheerder)"
        : `${displayName} (Beheerder)`;
    }
    if (uid === currentUser?.uid) return "Jij";
    return displayName;
  };

  const handleJoin = async () => {
    if (!currentUser) return Alert.alert("Fout", "Je moet ingelogd zijn.");
    if (isParticipant) return Alert.alert("Info", "Je zit al in deze match.");
    if (isFull) return Alert.alert("Vol", "Deze match is al volzet.");
    try {
      await updateDoc(doc(db, "matches", match.id), {
        players: arrayUnion(currentUser.uid),
      });
      setMatch({ ...match, players: [...match.players, currentUser.uid] });
    } catch (e) {
      Alert.alert("Fout", "Kon niet deelnemen.");
    }
  };

  const handleLeave = async () => {
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
  };

  const handleDeleteMatch = async () => {
    Alert.alert(
      "Match Annuleren",
      "Weet je zeker dat je deze match wilt annuleren?",
      [
        { text: "Nee", style: "cancel" },
        {
          text: "Ja, verwijder",
          style: "destructive",
          onPress: async () => {
            await deleteDoc(doc(db, "matches", match.id));
            const q = query(
              collection(db, "bookings"),
              where("matchId", "==", match.id),
            );
            const snap = await getDocs(q);
            snap.forEach(
              async (bDoc) => await deleteDoc(doc(db, "bookings", bDoc.id)),
            );
            router.replace("/");
          },
        },
      ],
    );
  };

  const handleShuffleTeams = async () => {
    if (!isFull)
      return Alert.alert("Wacht even", "Je kunt pas mixen bij 4 spelers.");
    const shuffled = [...match.players].sort(() => 0.5 - Math.random());
    try {
      await updateDoc(doc(db, "matches", match.id), { players: shuffled });
      setMatch({ ...match, players: shuffled });
      setSelectedSwapIndex(null);
    } catch (e) {
      Alert.alert("Fout", "Kon teams niet opslaan.");
    }
  };

  const handleSwapClick = async (index: number) => {
    if (!isCreator || !isFull) return;
    if (selectedSwapIndex === null) {
      setSelectedSwapIndex(index);
    } else if (selectedSwapIndex === index) {
      setSelectedSwapIndex(null);
    } else {
      const newPlayers = [...match.players];
      const temp = newPlayers[selectedSwapIndex];
      newPlayers[selectedSwapIndex] = newPlayers[index];
      newPlayers[index] = temp;
      try {
        await updateDoc(doc(db, "matches", match.id), { players: newPlayers });
        setMatch({ ...match, players: newPlayers });
        setSelectedSwapIndex(null);
      } catch (e) {
        Alert.alert("Fout", "Kon teamindeling niet opslaan.");
      }
    }
  };

  const openRoute = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.club)}`;
    Linking.openURL(url).catch(() =>
      Alert.alert("Fout", "Kon kaarten niet openen."),
    );
  };

  const handlePayment = async () => {
    if (!cardNumber || !expiry || !cvv) {
      Alert.alert("Fout", "Vul alle betaalgegevens in.");
      return;
    }
    setIsPaying(true);
    try {
      await updateDoc(doc(db, "matches", match.id), { isBooked: true });
      const q = query(
        collection(db, "bookings"),
        where("matchId", "==", match.id),
      );
      const snap = await getDocs(q);
      snap.forEach(async (bookingDoc) => {
        await updateDoc(doc(db, "bookings", bookingDoc.id), {
          status: "confirmed",
        });
      });
      setMatch({ ...match, isBooked: true });
      setShowPaymentModal(false);
      Alert.alert(
        "Succes",
        "De betaling is verwerkt. Het veld is definitief bevestigd.",
      );
    } catch (error) {
      Alert.alert("Fout", "Er ging iets mis met de betaling.");
    } finally {
      setIsPaying(false);
    }
  };

  const renderPlayer = (index: number) => {
    const isSelected = selectedSwapIndex === index;
    return (
      <TouchableOpacity
        activeOpacity={isCreator ? 0.6 : 1}
        disabled={!isCreator}
        onPress={() => handleSwapClick(index)}
        style={[styles.playerItemBox, isSelected && styles.selectedPlayerBox]}
      >
        <Ionicons
          name="person"
          size={16}
          color={isSelected ? "#00E676" : "#64748B"}
        />
        <Text
          style={[
            styles.playerItemText,
            isSelected && styles.selectedPlayerText,
          ]}
        >
          {getPlayerDisplay(index)}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );
  if (!match)
    return (
      <View style={styles.center}>
        <Text style={{ color: "#94A3B8", fontWeight: "bold" }}>
          Match niet gevonden.
        </Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Matchdetails</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.clubName}>{match.club}</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {match.isCompetitive ? "COMPETITIEF" : "RECREATIEF"}
              </Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={18} color="#94A3B8" />
            <Text style={styles.infoText}>{match.date}</Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="stats-chart-outline" size={18} color="#94A3B8" />
            <Text style={styles.infoText}>
              Niveau {match.minLevel} - {match.maxLevel}
            </Text>
          </View>

          <TouchableOpacity style={styles.routeBtn} onPress={openRoute}>
            <Ionicons name="location" size={16} color="#00E676" />
            <Text style={styles.routeBtnText}>Bekijk Route</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sectionTitle}>
                Spelers ({match.players?.length || 0}/4)
              </Text>
              {isCreator && isFull && (
                <Text style={styles.hintText}>
                  Tik op 2 spelers om te wisselen
                </Text>
              )}
            </View>
            {isCreator && isFull && (
              <TouchableOpacity
                onPress={handleShuffleTeams}
                style={styles.shuffleBtn}
              >
                <Ionicons name="shuffle" size={16} color="#00E676" />
                <Text style={styles.shuffleBtnText}>Mix</Text>
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
            <View
              style={[
                styles.waitingBox,
                match.isBooked && {
                  backgroundColor: "rgba(0, 230, 118, 0.1)",
                  borderColor: "rgba(0, 230, 118, 0.3)",
                },
              ]}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginBottom: 10,
                }}
              >
                {match.isBooked ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={20}
                    color="#00E676"
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <ActivityIndicator
                    size="small"
                    color="#F59E0B"
                    style={{ marginRight: 8 }}
                  />
                )}

                <Text
                  style={[
                    styles.waitingText,
                    match.isBooked && { color: "#00E676" },
                  ]}
                >
                  {match.isBooked
                    ? "Veld is definitief geboekt!"
                    : "Wachten op spelers..."}
                </Text>
              </View>
              {[0, 1, 2, 3].map((idx) => {
                if (idx >= (match.players?.length || 0)) return null;
                const p = match.players[idx];
                return (
                  <View key={p} style={styles.waitingPlayerRow}>
                    <Ionicons
                      name={match.isBooked ? "person" : "time"}
                      size={16}
                      color={match.isBooked ? "#00E676" : "#10B981"}
                    />
                    <Text style={styles.waitingPlayerText}>
                      {getPlayerDisplay(idx)}
                    </Text>
                  </View>
                );
              })}
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
                  style={[
                    styles.halfBtn,
                    styles.chatBtn,
                    match.isBooked && { flex: 1 },
                  ]}
                  onPress={() => router.push(`/chat/${match.id}` as any)}
                >
                  <Ionicons
                    name="chatbubble-ellipses"
                    size={20}
                    color="#0F172A"
                  />
                  <Text style={[styles.btnTextWhite, { color: "#0F172A" }]}>
                    Chat
                  </Text>
                </TouchableOpacity>

                {!match.isBooked && (
                  <TouchableOpacity
                    style={[styles.halfBtn, { backgroundColor: "#EF4444" }]}
                    onPress={isCreator ? handleDeleteMatch : handleLeave}
                  >
                    <Ionicons
                      name={isCreator ? "trash" : "exit"}
                      size={20}
                      color="#FFF"
                    />
                    <Text style={styles.btnTextWhite}>
                      {isCreator ? "Verwijderen" : "Verlaten"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {!match.isBooked && (
              <View style={styles.alertBox}>
                <Ionicons name="warning" size={24} color="#F59E0B" />
                {!hasEnoughPlayersToConfirm ? (
                  <Text style={styles.alertText}>
                    Voorlopig gereserveerd. Er zijn minimaal 2 spelers nodig om
                    definitief te bevestigen.
                  </Text>
                ) : isCreator ? (
                  <View style={{ width: "100%", alignItems: "center" }}>
                    <Text style={styles.alertText}>
                      Klaar om te spelen! Betaal om het veld definitief te
                      claimen.
                    </Text>
                    <TouchableOpacity
                      style={styles.bookBtn}
                      onPress={() => setShowPaymentModal(true)}
                    >
                      <Text style={styles.bookBtnText}>Bevestig & Betaal</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <Text style={styles.alertText}>
                    Wachten op de beheerder om de reservering definitief te
                    maken.
                  </Text>
                )}
              </View>
            )}

            {isCreator &&
              isFull &&
              match.isBooked &&
              isPast &&
              match.status !== "played" && (
                <TouchableOpacity
                  style={styles.adminBtn}
                  onPress={() =>
                    router.push(`/match-result/${match.id}` as any)
                  }
                >
                  <Ionicons name="trophy" size={20} color="#111827" />
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

        <Modal
          visible={showPaymentModal}
          animationType="slide"
          transparent={true}
        >
          <KeyboardAvoidingView
            style={styles.modalOverlay}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Bevestig Reservering</Text>
                <Text style={styles.modalSubTitle}>
                  Rond de betaling af om het veld te claimen.
                </Text>

                <View style={styles.paymentContainer}>
                  <TextInput
                    style={styles.input}
                    placeholder="Kaartnummer"
                    placeholderTextColor="#64748B"
                    value={cardNumber}
                    onChangeText={setCardNumber}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                  <View style={styles.row}>
                    <TextInput
                      style={[styles.input, { flex: 1, marginRight: 10 }]}
                      placeholder="MM/JJ"
                      placeholderTextColor="#64748B"
                      value={expiry}
                      onChangeText={setExpiry}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="CVV"
                      placeholderTextColor="#64748B"
                      secureTextEntry
                      value={cvv}
                      onChangeText={setCvv}
                      keyboardType="number-pad"
                      returnKeyType="done"
                    />
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.primaryBtn, isPaying && { opacity: 0.7 }]}
                  onPress={handlePayment}
                  disabled={isPaying}
                >
                  <Text style={styles.primaryBtnText}>
                    {isPaying ? "Verwerken..." : "Betaal Nu"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cancelModalBtn}
                  onPress={() => setShowPaymentModal(false)}
                >
                  <Text style={styles.cancelModalText}>Annuleren</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Modal>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backBtn: { marginRight: 15 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#1E293B",
    padding: 24,
    borderRadius: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  clubName: { fontSize: 22, fontWeight: "900", color: "#F8FAFC", flex: 1 },
  badge: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "900", color: "#00E676" },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  infoText: {
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "600",
    marginLeft: 8,
  },
  routeBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderRadius: 12,
  },
  routeBtnText: { color: "#00E676", fontWeight: "900", marginLeft: 6 },
  separator: { height: 1, backgroundColor: "#334155", marginVertical: 24 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  sectionTitle: { fontSize: 18, fontWeight: "900", color: "#F8FAFC" },
  hintText: { fontSize: 12, color: "#94A3B8", marginTop: 2, fontWeight: "500" },
  shuffleBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  shuffleBtnText: {
    color: "#00E676",
    fontSize: 13,
    fontWeight: "800",
    marginLeft: 6,
  },

  teamsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0B1120",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },

  teamBox: { flex: 1 },
  teamTitle: {
    fontWeight: "900",
    color: "#00E676",
    marginBottom: 12,
    fontSize: 16,
  },
  playerItemBox: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  selectedPlayerBox: {
    borderColor: "#00E676",
    backgroundColor: "rgba(0, 230, 118, 0.05)",
  },
  playerItemText: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 8,
  },
  selectedPlayerText: { color: "#00E676", fontWeight: "900" },
  vsBox: { paddingHorizontal: 15 },
  vsText: { fontWeight: "900", color: "#334155", fontSize: 18 },
  waitingBox: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 20,
    borderRadius: 16,
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  waitingText: { color: "#FCD34D", fontWeight: "800", fontSize: 15 },
  waitingPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  waitingPlayerText: { color: "#E2E8F0", fontWeight: "600", marginLeft: 6 },
  actionContainer: { marginTop: 10 },
  primaryBtn: {
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  primaryBtnText: { color: "#0F172A", fontWeight: "900", fontSize: 16 },
  rowBtns: { flexDirection: "row", justifyContent: "space-between" },
  halfBtn: {
    flexDirection: "row",
    flex: 0.48,
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chatBtn: { backgroundColor: "#00E676" },
  leaveBtn: { backgroundColor: "#EF4444" },
  btnTextWhite: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 15,
    marginLeft: 8,
  },
  alertBox: {
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    padding: 20,
    borderRadius: 16,
    marginTop: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  alertText: {
    color: "#FCD34D",
    fontWeight: "700",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 15,
    lineHeight: 20,
  },
  bookBtn: {
    backgroundColor: "#00E676",
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  bookBtnText: { color: "#0F172A", fontWeight: "900", fontSize: 16 },
  adminBtn: {
    flexDirection: "row",
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  adminBtnText: {
    color: "#0F172A",
    fontWeight: "900",
    fontSize: 16,
    marginLeft: 8,
  },
  playedBox: {
    backgroundColor: "#0B1120",
    padding: 20,
    borderRadius: 16,
    marginTop: 20,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  playedText: { fontWeight: "900", color: "#F8FAFC", fontSize: 18 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#020617",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
    color: "#F8FAFC",
  },
  modalSubTitle: {
    fontSize: 15,
    color: "#94A3B8",
    marginBottom: 24,
    fontWeight: "500",
  },
  paymentContainer: {
    backgroundColor: "#0B1120",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 16,
  },
  row: { flexDirection: "row" },
  disabledBtn: { opacity: 0.5 },
  cancelModalBtn: { marginTop: 12, padding: 16, alignItems: "center" },
  cancelModalText: { color: "#EF4444", fontWeight: "800", fontSize: 16 },
});
