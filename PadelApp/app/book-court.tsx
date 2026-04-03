import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ImageBackground,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import * as Location from "expo-location";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PADEL_CLUBS } from "../data/clubs";

const getDistanceInKm = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(1);
};

export default function BookCourt() {
  const router = useRouter();
  const { matchId } = useLocalSearchParams();
  const [location, setLocation] = useState<Location.LocationObject | null>(
    null,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sortedClubs, setSortedClubs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    (async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          setErrorMsg(
            "Locatie geweigerd. Clubs staan in willekeurige volgorde.",
          );
          setSortedClubs([...PADEL_CLUBS].sort(() => Math.random() - 0.5));
          setIsLoading(false);
          return;
        }

        let currentLocation = await Location.getCurrentPositionAsync({});
        setLocation(currentLocation);

        const userLat = currentLocation.coords.latitude;
        const userLng = currentLocation.coords.longitude;

        const distanceSortedClubs = [...PADEL_CLUBS].sort((a, b) => {
          const distA = parseFloat(
            getDistanceInKm(userLat, userLng, a.lat, a.lng),
          );
          const distB = parseFloat(
            getDistanceInKm(userLat, userLng, b.lat, b.lng),
          );
          return distA - distB;
        });

        setSortedClubs(distanceSortedClubs);
      } catch (error) {
        setErrorMsg("Fout bij zoeken locatie. Willekeurige volgorde.");
        setSortedClubs([...PADEL_CLUBS].sort(() => Math.random() - 0.5));
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const renderClubCard = ({ item }: { item: any }) => {
    const distance = location
      ? getDistanceInKm(
          location.coords.latitude,
          location.coords.longitude,
          item.lat,
          item.lng,
        )
      : "?";

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.9}
        onPress={() =>
          router.push(`/bookdetail/${item.id}?matchId=${matchId}` as any)
        }
      >
        <ImageBackground
          source={
            typeof item.image === "string" ? { uri: item.image } : item.image
          }
          style={styles.cardImage}
          imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        >
          <View style={styles.distanceBadge}>
            <Ionicons name="location" size={14} color="#0F172A" />
            <Text style={styles.distanceText}>{distance} km</Text>
          </View>
        </ImageBackground>
        <View style={styles.cardInfo}>
          <Text style={styles.clubName}>{item.name}</Text>
          <View style={styles.actionRow}>
            <Text style={styles.tapText}>Bekijk uren en reserveer</Text>
            <Ionicons name="arrow-forward-circle" size={28} color="#00E676" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Kies een club</Text>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00E676" />
          <Text style={styles.loadingText}>Clubs in de buurt zoeken...</Text>
        </View>
      ) : (
        <>
          {errorMsg && (
            <View style={styles.warningBox}>
              <Ionicons name="warning" size={20} color="#00E676" />
              <Text style={styles.warningText}>{errorMsg}</Text>
            </View>
          )}
          <FlatList
            data={sortedClubs}
            keyExtractor={(item) => item.id}
            renderItem={renderClubCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
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
    letterSpacing: -0.5,
  },
  center: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
    backgroundColor: "#0F172A" 
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: "#94A3B8",
    fontWeight: "600",
  },
  warningBox: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    padding: 12,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
  },
  warningText: { color: "#00E676", fontWeight: "700", marginLeft: 8 },
  listContainer: { padding: 20, paddingBottom: 40 },
  card: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  cardImage: {
    width: "100%",
    height: 160,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 12,
  },
  distanceBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00E676",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  distanceText: {
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "800",
    marginLeft: 4,
  },
  cardInfo: { padding: 16 },
  clubName: {
    fontSize: 20,
    fontWeight: "900",
    color: "#F8FAFC",
    marginBottom: 8,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tapText: { fontSize: 15, color: "#94A3B8", fontWeight: "600" },
});