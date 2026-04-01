import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { doc, getDoc, updateDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebaseConfig'; // Pad gecontroleerd
import { signOut } from 'firebase/auth';
import { Ionicons } from '@expo/vector-icons';

const AVATARS = [
  'https://cdn-icons-png.flaticon.com/512/3940/3940403.png',
  'https://cdn-icons-png.flaticon.com/512/3940/3940401.png',
  'https://cdn-icons-png.flaticon.com/512/3940/3940405.png',
  'https://cdn-icons-png.flaticon.com/512/3940/3940400.png',
  'https://cdn-icons-png.flaticon.com/512/3940/3940398.png',
  'https://cdn-icons-png.flaticon.com/512/3940/3940397.png',
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
      const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
      if (userDoc.exists()) {
        setUser({ id: userDoc.id, ...userDoc.data() });
      }

      const matchSnap = await getDocs(query(
        collection(db, 'matches'),
        where('status', '==', 'played'),
        where('players', 'array-contains', currentUser.uid)
      ));

      let won = 0;
      let lost = 0;
      matchSnap.docs.forEach(doc => {
        const data = doc.data();
        const playerIdx = data.players.indexOf(currentUser.uid);
        const playerTeam = playerIdx <= 1 ? 'team1' : 'team2';
        if (data.winner === playerTeam) won++; else lost++;
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
    if (status !== 'granted') {
      Alert.alert('Fout', 'Toegang tot foto\'s is vereist.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].uri) {
      uploadImage(result.assets[0].uri);
    }
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
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePic: downloadURL });
      setUser((prev: any) => ({ ...prev, profilePic: downloadURL }));
    } catch (error) {
      Alert.alert('Fout', 'Upload mislukt.');
    } finally {
      setUploading(false);
    }
  };

  const selectAvatar = async (avatarUrl: string) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setModalVisible(false);
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { profilePic: avatarUrl });
      setUser((prev: any) => ({ ...prev, profilePic: avatarUrl }));
    } catch (error) {
      Alert.alert('Fout', 'Kon avatar niet instellen.');
    }
  };

  const handleLogout = () => {
    Alert.alert("Uitloggen", "Weet je zeker dat je wilt uitloggen?", [
      { text: "Annuleer", style: "cancel" },
      { text: "Log uit", style: "destructive", onPress: () => signOut(auth).then(() => router.replace('/login')) }
    ]);
  };

  if (loading) return <View style={styles.center}><ActivityIndicator color="#4CAF50" size="large" /></View>;

  const badge = user?.level < 2 ? { label: 'Beginner', color: '#90CAF9' } : user?.level < 4 ? { label: 'Intermediate', color: '#4CAF50' } : { label: 'Expert', color: '#FFD700' };

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      {/* TERUGKNOP BOVENAAN */}
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.imageContainer}>
            <Image 
              source={{ uri: user?.profilePic || 'https://via.placeholder.com/150' }} 
              style={styles.profileImg} 
            />
            <View style={styles.editIcon}><Ionicons name="camera" size={20} color="#fff" /></View>
            <View style={[styles.badgeContainer, { backgroundColor: badge.color }]}>
              <Text style={styles.badgeText}>{badge.label}</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.userName}>{user?.firstName} {user?.lastName}</Text>
          <View style={styles.levelCard}>
            <Text style={styles.levelLabel}>ACTUEEL NIVEAU</Text>
            <Text style={styles.levelValue}>{user?.level?.toFixed(2) || '1.00'}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Prestaties</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats.total}</Text>
            <Text style={styles.statLabel}>Matchen</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{stats.winRate}%</Text>
            <Text style={styles.statLabel}>Win-rate</Text>
          </View>
        </View>

        <View style={styles.rowStats}>
          <View style={[styles.statBox, { borderLeftColor: '#4CAF50' }]}>
            <Text style={styles.boxLabel}>Gewonnen</Text>
            <Text style={styles.boxValue}>{stats.won}</Text>
          </View>
          <View style={[styles.statBox, { borderLeftColor: '#F44336' }]}>
            <Text style={styles.boxLabel}>Verloren</Text>
            <Text style={styles.boxValue}>{stats.lost}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#F44336" />
          <Text style={styles.logoutText}>Uitloggen</Text>
        </TouchableOpacity>
        <View style={{ height: 50 }} />
      </ScrollView>

      {/* Modal blijft hetzelfde... */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kies profielfoto</Text>
            <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
              <Ionicons name="images-outline" size={24} color="#007AFF" />
              <Text style={styles.optionText}>Upload eigen foto</Text>
            </TouchableOpacity>
            <Text style={styles.avatarSubTitle}>Of kies een avatar:</Text>
            <FlatList data={AVATARS} keyExtractor={(item) => item} horizontal showsHorizontalScrollIndicator={false}
              renderItem={({ item }) => (
                <TouchableOpacity onPress={() => selectAvatar(item)} style={styles.avatarItem}>
                  <Image source={{ uri: item }} style={styles.avatarImg} />
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.closeBtn} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeBtnText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20 },
  topNav: { paddingTop: 60, paddingHorizontal: 20, backgroundColor: '#F8F9FA' },
  backButton: { width: 40, height: 40, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 30 },
  imageContainer: { position: 'relative', marginBottom: 15 },
  profileImg: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#fff' },
  editIcon: { position: 'absolute', top: 5, right: 5, backgroundColor: '#007AFF', width: 34, height: 34, borderRadius: 17, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#fff' },
  badgeContainer: { position: 'absolute', bottom: -5, right: -5, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12, elevation: 3 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  userName: { fontSize: 24, fontWeight: '900', color: '#333' },
  levelCard: { backgroundColor: '#fff', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 20, marginTop: 15, alignItems: 'center', elevation: 2 },
  levelLabel: { fontSize: 10, color: '#999', fontWeight: 'bold', letterSpacing: 1 },
  levelValue: { fontSize: 32, fontWeight: '900', color: '#333' },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginBottom: 15, marginTop: 10 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  statItem: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 15, alignItems: 'center', marginHorizontal: 5, elevation: 1 },
  statValue: { fontSize: 22, fontWeight: 'bold' },
  statLabel: { fontSize: 12, color: '#666' },
  rowStats: { flexDirection: 'row', justifyContent: 'space-between' },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 15, borderRadius: 12, marginHorizontal: 5, borderLeftWidth: 4, elevation: 1 },
  boxLabel: { fontSize: 11, color: '#999', fontWeight: 'bold' },
  boxValue: { fontSize: 18, fontWeight: 'bold', marginTop: 5 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 40, padding: 15, backgroundColor: '#FFEBEE', borderRadius: 12 },
  logoutText: { color: '#F44336', fontWeight: 'bold', marginLeft: 10 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 25 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  optionBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F8FF', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#007AFF' },
  optionText: { color: '#007AFF', fontWeight: 'bold', marginLeft: 15, fontSize: 16 },
  avatarSubTitle: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: 'bold' },
  avatarItem: { marginRight: 15 },
  avatarImg: { width: 70, height: 70, borderRadius: 35 },
  closeBtn: { marginTop: 20, padding: 15, alignItems: 'center', backgroundColor: '#eee', borderRadius: 12 },
  closeBtnText: { color: '#333', fontWeight: 'bold' }
});