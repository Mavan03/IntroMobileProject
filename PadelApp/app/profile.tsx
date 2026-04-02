import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
} from "react-native";
import { useRouter } from "expo-router";
import {
  doc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import * as ImagePicker from "expo-image-picker";
import { auth, db, storage } from "../config/firebaseConfig";
import { signOut } from "firebase/auth";
import { Ionicons } from "@expo/vector-icons";

const AVATARS = [
  "https://cdn-icons-png.flaticon.com/512/3940/3940403.png",
  "https://cdn-icons-png.flaticon.com/512/3940/3940401.png",
  "https://cdn-icons-png.flaticon.com/512/3940/3940405.png",
  "https://cdn-icons-png.flaticon.com/512/3940/3940400.png",
  "https://cdn-icons-png.flaticon.com/512/3940/3940398.png",
  "https://cdn-icons-png.flaticon.com/512/3940/3940397.png",
];

export default function Profile() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, won: 0, lost: 0, winRate: 0 });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    try {
      const userDoc = await getDoc(doc(db, "users", currentUser.uid));
      if (userDoc.exists()) setUser({ id: userDoc.id, ...userDoc.data() });

      const matchSnap = await getDocs(
        query(
          collection(db, "matches"),
          where("status", "==", "played"),
          where("players", "array-contains", currentUser.uid),
        ),
      );

      let won = 0;
      let lost = 0;
      matchSnap.docs.forEach((doc) => {
        const data = doc.data();
        const playerIdx = data.players.indexOf(currentUser.uid);
        const playerTeam = playerIdx <= 1 ? "team1" : "team2";
        if (data.winner === playerTeam) won++;
        else lost++;
      });

      const total = matchSnap.docs.length;
      const winRate = total > 0 ? Math.round((won / total) * 100) : 0;
      setStats({ total, won, lost, winRate });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    setModalVisible(false);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted")
      return Alert.alert("Fout", "Toegang tot foto's is vereist.");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled && result.assets[0].uri)
      uploadImage(result.assets[0].uri);
  };

  const uploadImage = async (uri: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setUploading(true);
    try {
      const storageRef = ref(storage, `profilePics/${currentUser.uid}.jpg`);
      const response = await fetch(uri);
      const blob = await response.blob();
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      await updateDoc(doc(db, "users", currentUser.uid), {
        profilePic: downloadURL,
      });
      setUser((prev: any) => ({ ...prev, profilePic: downloadURL }));
    } catch (error) {
      Alert.alert("Fout", "Upload mislukt.");
    } finally {
      setUploading(false);
    }
  };

  const selectAvatar = async (avatarUrl: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setModalVisible(false);
    try {
      await updateDoc(doc(db, "users", currentUser.uid), {
        profilePic: avatarUrl,
      });
      setUser((prev: any) => ({ ...prev, profilePic: avatarUrl }));
    } catch (error) {
      Alert.alert("Fout", "Kon avatar niet instellen.");
    }
  };

  const handleLogout = () => {
    Alert.alert("Uitloggen", "Weet je zeker dat je wilt uitloggen?", [
      { text: "Annuleer", style: "cancel" },
      {
        text: "Log uit",
        style: "destructive",
        onPress: () => signOut(auth).then(() => router.replace("/login")),
      },
    ]);
  };

  if (loading)
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#00E676" size="large" />
      </View>
    );

  const badge =
    user?.level < 2
      ? { label: "Beginner", color: "#3B82F6" }
      : user?.level < 4
        ? { label: "Intermediate", color: "#10B981" }
        : { label: "Expert", color: "#F59E0B" };

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.darkHeader}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={28} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.profileContainer}>
          <TouchableOpacity
            onPress={() => setModalVisible(true)}
            style={styles.imageContainer}
          >
            <Image
              source={{
                uri: user?.profilePic || "https://via.placeholder.com/150",
              }}
              style={styles.profileImg}
            />
            <View style={styles.editIcon}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
            <View
              style={[styles.badgeContainer, { backgroundColor: badge.color }]}
            >
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>

          <View style={styles.levelCard}>
            <Text style={styles.levelLabel}>ACTUEEL NIVEAU</Text>
            <Text style={styles.levelValue}>
              {user?.level?.toFixed(2) || "1.00"}
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Prestaties</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Gespeeld</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: "#00E676" }]}>
              {stats.winRate}%
            </Text>
            <Text style={styles.statLabel}>Win-rate</Text>
          </View>
        </View>

        <View style={styles.rowStats}>
          <View style={[styles.statBox, { borderLeftColor: "#00E676" }]}>
            <Text style={styles.boxLabel}>Gewonnen</Text>
            <Text style={styles.boxValue}>{stats.won}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: "#EF4444" }]}>
            <Text style={styles.boxLabel}>Verloren</Text>
            <Text style={styles.boxValue}>{stats.lost}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={22} color="#EF4444" />
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kies profielfoto</Text>
            <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#111827" />
              <Text style={styles.optionText}>Upload eigen foto</Text>
            </TouchableOpacity>
            <Text style={styles.avatarSubTitle}>Of kies een avatar:</Text>
            <FlatList
              data={AVATARS}
              keyExtractor={(item) => item}
              horizontal
              showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => selectAvatar(item)}
                  style={styles.avatarItem}
                >
                  <Image source={{ uri: item }} style={styles.avatarImg} />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.closeBtnText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F3F4F6" },
  scrollContent: { flexGrow: 1, paddingBottom: 40 },
  darkHeader: {
    backgroundColor: "#111827",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  backButton: { alignSelf: "flex-start" },
  profileContainer: { alignItems: "center", marginTop: -60, marginBottom: 30 },
  imageContainer: { position: "relative", marginBottom: 15 },
  profileImg: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: "#FFF",
  },
  editIcon: {
    position: "absolute",
    top: 5,
    right: 0,
    backgroundColor: "#111827",
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#FFF",
  },
  badgeContainer: {
    position: "absolute",
    bottom: -5,
    right: -15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  userName: { fontSize: 26, fontWeight: "900", color: "#111827" },
  levelCard: {
    backgroundColor: "#111827",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 24,
    marginTop: 16,
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  levelLabel: {
    fontSize: 11,
    color: "#9CA3AF",
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  levelValue: { fontSize: 34, fontWeight: "900", color: "#00E676" },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 16,
    paddingHorizontal: 20,
    color: "#111827",
  },
  statsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  statItem: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 20,
    borderRadius: 20,
    alignItems: "center",
    marginHorizontal: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statValue: { fontSize: 28, fontWeight: "900", color: "#111827" },
  statLabel: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "700",
    marginTop: 4,
  },
  rowStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  statBox: {
    flex: 1,
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 5,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  boxLabel: { fontSize: 12, color: "#6B7280", fontWeight: "800" },
  boxValue: { fontSize: 24, fontWeight: "900", marginTop: 6, color: "#111827" },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 40,
    marginHorizontal: 20,
    padding: 18,
    backgroundColor: "#FEF2F2",
    borderRadius: 16,
  },
  logoutText: {
    color: "#EF4444",
    fontWeight: "900",
    marginLeft: 10,
    fontSize: 16,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(17,24,39,0.7)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 24,
    textAlign: "center",
    color: "#111827",
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    padding: 18,
    borderRadius: 16,
    marginBottom: 24,
  },
  optionText: {
    color: "#111827",
    fontWeight: "800",
    marginLeft: 15,
    fontSize: 16,
  },
  avatarSubTitle: {
    fontSize: 15,
    color: "#4B5563",
    marginBottom: 12,
    fontWeight: "800",
  },
  avatarItem: { marginRight: 16 },
  avatarImg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: "#F3F4F6",
  },
  closeBtn: {
    marginTop: 30,
    padding: 18,
    alignItems: "center",
    backgroundColor: "#111827",
    borderRadius: 16,
  },
  closeBtnText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
});
