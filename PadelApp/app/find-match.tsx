import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useRouter } from "expo-router";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";

export default function FindMatch() {
  const router = useRouter();
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [minLevel, setMinLevel] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "comp" | "rec">("all");

  useEffect(() => {
    fetchMatches();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [minLevel, onlyAvailable, typeFilter, allMatches]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, "matches"));
      const matches = querySnapshot.docs.map(
        (doc) => ({ id: doc.id, ...doc.data() }) as any,
      );
      const activeMatches = matches.filter((m) => m.status !== "played");
      setAllMatches(activeMatches);
      setFilteredMatches(activeMatches);
    } catch (error) {
      Alert.alert("Fout", "Kon matchen niet ophalen.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let tempMatches = [...allMatches];
    if (minLevel !== "") {
      const levelNum = parseFloat(minLevel);
      tempMatches = tempMatches.filter((m) => m.minLevel >= levelNum);
    }
    if (onlyAvailable) {
      tempMatches = tempMatches.filter((m) => m.players?.length < 4);
    }
    if (typeFilter === "comp") {
      tempMatches = tempMatches.filter((m) => m.isCompetitive === true);
    } else if (typeFilter === "rec") {
      tempMatches = tempMatches.filter((m) => m.isCompetitive === false);
    }
    setFilteredMatches(tempMatches);
  };

  const renderMatchItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.matchCard}
      activeOpacity={0.8}
      onPress={() => router.push(`/match/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clubName}>{item.club}</Text>
        <View style={styles.badge}>
          <Text style={styles.typeBadge}>
            {item.isCompetitive ? "Competitief" : "Recreatief"}
          </Text>
        </View>
      </View>

      <View style={styles.detailRow}>
        <Ionicons name="calendar-outline" size={16} color="#94A3B8" />
        <Text style={styles.dateText}>{item.date}</Text>
      </View>

      <View style={styles.cardFooter}>
        <View style={styles.detailRow}>
          <Ionicons name="stats-chart-outline" size={16} color="#94A3B8" />
          <Text style={styles.levelTag}>
            Niv. {item.minLevel} - {item.maxLevel}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons
            name="people-outline"
            size={16}
            color={item.players?.length === 4 ? "#EF4444" : "#00E676"}
          />
          <Text
            style={[
              styles.playerCount,
              item.players?.length === 4 && styles.fullText,
            ]}
          >
            {item.players?.length}/4
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#020617" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.title}>Zoek match</Text>
          </View>

          <View style={styles.filterSection}>
            <Text style={styles.filterLabel}>Filters</Text>
            <View style={styles.row}>
              <TextInput
                style={styles.levelInput}
                placeholder="Min. Niveau (bv. 2.0)"
                placeholderTextColor="#64748B"
                keyboardType="numeric"
                returnKeyType="done"
                value={minLevel}
                onChangeText={setMinLevel}
              />
              <TouchableOpacity
                style={[
                  styles.toggleBtn,
                  onlyAvailable && styles.toggleBtnActive,
                ]}
                onPress={() => setOnlyAvailable(!onlyAvailable)}
              >
                <Text
                  style={[
                    styles.toggleText,
                    onlyAvailable && styles.activeText,
                  ]}
                >
                  Enkel vrije plekken
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  typeFilter === "all" && styles.typeBtnActive,
                ]}
                onPress={() => setTypeFilter("all")}
              >
                <Text
                  style={[
                    styles.typeText,
                    typeFilter === "all" && styles.activeText,
                  ]}
                >
                  Alles
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  typeFilter === "comp" && styles.typeBtnActive,
                ]}
                onPress={() => setTypeFilter("comp")}
              >
                <Text
                  style={[
                    styles.typeText,
                    typeFilter === "comp" && styles.activeText,
                  ]}
                >
                  Competitief
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  typeFilter === "rec" && styles.typeBtnActive,
                ]}
                onPress={() => setTypeFilter("rec")}
              >
                <Text
                  style={[
                    styles.typeText,
                    typeFilter === "rec" && styles.activeText,
                  ]}
                >
                  Recreatief
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {loading ? (
            <ActivityIndicator
              size="large"
              color="#00E676"
              style={{ marginTop: 50 }}
            />
          ) : (
            <FlatList
              data={filteredMatches}
              keyExtractor={(item) => item.id}
              renderItem={renderMatchItem}
              contentContainerStyle={styles.list}
              bounces={false}
              overScrollMode="never"
              ListEmptyComponent={
                <Text style={styles.empty}>Geen matchen gevonden.</Text>
              }
            />
          )}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backBtn: { paddingRight: 15 },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  filterSection: {
    backgroundColor: "#0F172A",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 12,
  },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  levelInput: {
    flex: 1,
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    marginRight: 10,
    color: "#F8FAFC",
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "#334155",
  },
  toggleBtn: {
    backgroundColor: "#1E293B",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderColor: "#00E676",
  },
  toggleText: { fontSize: 13, fontWeight: "800", color: "#94A3B8" },
  activeText: { color: "#00E676" },
  typeRow: { flexDirection: "row", justifyContent: "space-between" },
  typeBtn: {
    flex: 1,
    backgroundColor: "#1E293B",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "#334155",
  },
  typeBtnActive: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    borderColor: "#00E676",
  },
  typeText: { fontSize: 13, fontWeight: "800", color: "#94A3B8" },
  list: { padding: 20, paddingBottom: 40 },
  matchCard: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  clubName: { fontSize: 18, fontWeight: "900", color: "#F8FAFC" },
  badge: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeBadge: {
    fontSize: 11,
    fontWeight: "900",
    color: "#00E676",
    textTransform: "uppercase",
  },
  detailRow: { flexDirection: "row", alignItems: "center" },
  dateText: {
    color: "#94A3B8",
    marginLeft: 8,
    fontWeight: "700",
    fontSize: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#334155",
    paddingTop: 12,
    marginTop: 12,
  },
  levelTag: {
    fontSize: 14,
    color: "#F8FAFC",
    marginLeft: 6,
    fontWeight: "800",
  },
  playerCount: {
    fontSize: 14,
    fontWeight: "900",
    color: "#00E676",
    marginLeft: 6,
  },
  fullText: { color: "#EF4444" },
  empty: {
    textAlign: "center",
    marginTop: 40,
    color: "#64748B",
    fontStyle: "italic",
    fontWeight: "600",
  },
});
