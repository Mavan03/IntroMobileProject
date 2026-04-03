import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ImageBackground,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { onAuthStateChanged, signOut } from "firebase/auth";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  deleteDoc,
} from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { PADEL_CLUBS } from "../data/clubs";

const parseDateToTime = (dateStr: string) => {
  try {
    if (!dateStr) return 0;
    const parts = dateStr.match(/\d+/g);
    if (!parts || parts.length < 3) return 0;
    const day = parseInt(parts[0], 10),
      month = parseInt(parts[1], 10) - 1,
      year = parseInt(parts[2], 10);
    const hours = parts[3] ? parseInt(parts[3], 10) : 0,
      minutes = parts[4] ? parseInt(parts[4], 10) : 0;
    return new Date(year, month, day, hours, minutes).getTime();
  } catch (e) {
    return 0;
  }
};

const getDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180),
    dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return parseFloat((R * c).toFixed(1));
};

export default function Dashboard() {
  const router = useRouter();
  const [firstName, setFirstName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [myMatches, setMyMatches] = useState<any[]>([]);
  const [myBookings, setMyBookings] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [closestClub, setClosestClub] = useState<any>(PADEL_CLUBS[0]);
  const [closestDistance, setClosestDistance] = useState<number | null>(null);

  const cleanupOldPendingMatches = async () => {
    try {
      const matchSnap = await getDocs(collection(db, "matches"));
      const now = new Date().getTime();
      matchSnap.docs.forEach(async (docSnap) => {
        const mData = docSnap.data();
        if (!mData.isBooked && mData.status !== "played") {
          const matchTime = parseDateToTime(mData.date);
          if (matchTime > 0 && matchTime < now) {
            await deleteDoc(doc(db, "matches", docSnap.id));
            const q = query(
              collection(db, "bookings"),
              where("matchId", "==", docSnap.id),
            );
            const bSnap = await getDocs(q);
            bSnap.forEach(
              async (bDoc) => await deleteDoc(doc(db, "bookings", bDoc.id)),
            );
          }
        }
      });
    } catch (e) {
      console.log("Fout bij schoonmaken:", e);
    }
  };

  const fetchData = async (user: any) => {
    try {
      await cleanupOldPendingMatches();
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setFirstName(userDoc.data().firstName);

      const matchSnap = await getDocs(collection(db, "matches"));
      const matches = matchSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as any,
      );

      const userMatches = matches
        .filter(
          (m) =>
            (m.creatorId === user.uid || m.players?.includes(user.uid)) &&
            m.status !== "played",
        )
        .sort((a, b) => parseDateToTime(a.date) - parseDateToTime(b.date))
        .slice(0, 5);
      setMyMatches(userMatches);

      const bookingSnap = await getDocs(
        query(collection(db, "bookings"), where("userId", "==", user.uid)),
      );
      const bookings = bookingSnap.docs.map(
        (d) => ({ id: d.id, ...d.data() }) as any,
      );

      const sortedBookings = bookings
        .sort(
          (a, b) =>
            parseDateToTime(`${a.displayDate} ${a.displayTime}`) -
            parseDateToTime(`${b.displayDate} ${b.displayTime}`),
        )
        .slice(0, 5);
      setMyBookings(sortedBookings);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === "granted") {
          let loc = await Location.getCurrentPositionAsync({});
          let minDistance = Infinity,
            foundClub = PADEL_CLUBS[0];
          PADEL_CLUBS.forEach((club) => {
            const d = getDistanceInKm(
              loc.coords.latitude,
              loc.coords.longitude,
              club.lat,
              club.lng,
            );
            if (d < minDistance) {
              minDistance = d;
              foundClub = club;
            }
          });
          setClosestClub(foundClub);
          setClosestDistance(minDistance);
        }
      } catch (e) {
        console.log("Locatie niet beschikbaar.");
      }

      if (user) {
        setIsLoggedIn(true);
        setIsLoading(true);
        await fetchData(user);
        setIsLoading(false);
      } else {
        setIsLoggedIn(false);
        setMyMatches([]);
        setMyBookings([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleCancelBooking = (bookingId: string) => {
    Alert.alert(
      "Reservering annuleren",
      "Weet je zeker dat je deze reservering wilt verwijderen?",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijder",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "bookings", bookingId));
              setMyBookings((prev) => prev.filter((b) => b.id !== bookingId));
            } catch (e) {
              Alert.alert("Fout", "Kon de reservering niet annuleren.");
            }
          },
        },
      ],
    );
  };

  const formatTimeNoSec = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split(":");
    return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : dateStr;
  };

  return (
    <View style={styles.screenWrapper}>
      <View style={styles.darkHeader}>
        <View>
          <Text style={styles.greeting}>Klaar voor een match?</Text>
          <Text style={styles.title}>
            {isLoggedIn ? `Hey, ${firstName}` : "Padel Manager"}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {!isLoggedIn ? (
            <TouchableOpacity
              style={styles.loginBtn}
              onPress={() => router.push("/login")}
            >
              <Text style={styles.loginBtnText}>Inloggen</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.iconBtn}
              onPress={() => router.push("/profile")}
            >
              <Ionicons name="person-circle" size={42} color="#00E676" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <TouchableOpacity
          style={styles.heroCard}
          activeOpacity={0.9}
          onPress={() => router.push("/book-court")}
        >
          <ImageBackground
            source={
              typeof closestClub.image === "string"
                ? { uri: closestClub.image }
                : closestClub.image
            }
            style={styles.heroImage}
            imageStyle={{ borderRadius: 20 }}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>Speel vandaag nog</Text>
              <View style={styles.heroLocationRow}>
                <Ionicons name="location" size={16} color="#00E676" />
                <Text style={styles.heroSubtitle}>
                  {closestDistance
                    ? `${closestClub.name} op ${closestDistance} km`
                    : "Zoek een club in de buurt"}
                </Text>
              </View>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Snelle acties</Text>
        <View style={styles.grid}>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push("/find-match")}
          >
            <View style={styles.iconBox}>
              <Ionicons name="search" size={24} color="#00E676" />
            </View>
            <Text style={styles.gridTitle}>Zoek match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push("/create-match")}
          >
            <View style={styles.iconBox}>
              <Ionicons name="add-circle" size={24} color="#00E676" />
            </View>
            <Text style={styles.gridTitle}>Maak match</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.gridItem}
            onPress={() => router.push("/book-court")}
          >
            <View style={styles.iconBox}>
              <Ionicons name="calendar" size={24} color="#00E676" />
            </View>
            <Text style={styles.gridTitle}>Veld boeken</Text>
          </TouchableOpacity>
        </View>

        {isLoggedIn && (
          <>
            <Text style={styles.sectionTitle}>Aankomende matchen</Text>
            {isLoading ? (
              <ActivityIndicator color="#00E676" style={{ marginTop: 20 }} />
            ) : myMatches.length > 0 ? (
              myMatches.map((match) => (
                <TouchableOpacity
                  key={match.id}
                  style={styles.matchCard}
                  activeOpacity={0.8}
                  onPress={() => router.push(`/match/${match.id}`)}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardClub}>{match.club}</Text>
                    <View style={styles.cardDetailRow}>
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color="#94A3B8"
                      />
                      <Text style={styles.cardDate}>
                        {formatTimeNoSec(match.date)}
                      </Text>
                    </View>
                    <View style={styles.statusRow}>
                      <Ionicons
                        name="people-outline"
                        size={14}
                        color={
                          match.players?.length === 4 ? "#00E676" : "#94A3B8"
                        }
                      />
                      <Text
                        style={[
                          styles.playerCount,
                          match.players?.length === 4 && styles.fullText,
                        ]}
                      >
                        {match.players?.length}/4 spelers
                      </Text>
                      {match.isBooked && (
                        <Text style={styles.readyTag}> • Bevestigd</Text>
                      )}
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={20} color="#334155" />
                </TouchableOpacity>
              ))
            ) : (
              <Text style={styles.emptyText}>Geen matchen gepland.</Text>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
              Mijn reserveringen
            </Text>
            {myBookings.length > 0 ? (
              myBookings.map((booking) => (
                <View
                  key={booking.id}
                  style={[
                    styles.matchCard,
                    {
                      borderLeftColor:
                        booking.status === "pending" ? "#F59E0B" : "#00E676",
                    },
                  ]}
                >
                  <View style={styles.cardContent}>
                    <Text style={styles.cardClub}>{booking.clubName}</Text>
                    <View style={styles.cardDetailRow}>
                      <Ionicons name="time-outline" size={14} color="#94A3B8" />
                      <Text style={styles.cardDate}>
                        {booking.displayDate} om {booking.displayTime}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.bookingStatus,
                        {
                          color:
                            booking.status === "pending"
                              ? "#F59E0B"
                              : "#00E676",
                        },
                      ]}
                    >
                      {booking.status === "pending"
                        ? "Voorlopig (Wacht op betaling)"
                        : "Definitief bevestigd"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleCancelBooking(booking.id)}
                    style={styles.cancelBtn}
                  >
                    <Ionicons name="trash-outline" size={22} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Geen velden gereserveerd.</Text>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenWrapper: { flex: 1, backgroundColor: "#020617" },
  darkHeader: {
    backgroundColor: "#0F172A",
    paddingTop: 65,
    paddingBottom: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 5,
  },
  headerActions: { flexDirection: "row", alignItems: "center" },
  iconBtn: { marginLeft: 15 },
  greeting: {
    fontSize: 14,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  loginBtn: {
    backgroundColor: "#00E676",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  loginBtnText: { color: "#0F172A", fontWeight: "800" },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  heroCard: {
    width: "100%",
    height: 180,
    marginTop: -30,
    marginBottom: 25,
    borderRadius: 20,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  heroImage: { flex: 1, justifyContent: "flex-end" },
  heroOverlay: {
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  heroTitle: {
    color: "#F8FAFC",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 4,
  },
  heroLocationRow: { flexDirection: "row", alignItems: "center" },
  heroSubtitle: {
    color: "#E2E8F0",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    marginTop: 10,
    color: "#F8FAFC",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "31%",
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    marginBottom: 15,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#F8FAFC",
    textAlign: "center",
  },
  matchCard: {
    backgroundColor: "#1E293B",
    padding: 18,
    borderRadius: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#00E676",
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardContent: { flex: 1 },
  cardClub: {
    fontSize: 16,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 4,
  },
  cardDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  cardDate: {
    color: "#94A3B8",
    fontSize: 13,
    marginLeft: 6,
    fontWeight: "600",
  },
  statusRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  playerCount: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 6,
    fontWeight: "700",
  },
  fullText: { color: "#00E676", fontWeight: "800" },
  readyTag: { fontSize: 12, color: "#00E676", fontWeight: "800" },
  bookingStatus: { fontSize: 12, fontWeight: "800", marginTop: 4 },
  emptyText: {
    color: "#64748B",
    fontStyle: "italic",
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 20,
  },
  cancelBtn: { padding: 10, marginLeft: 10 },
});
