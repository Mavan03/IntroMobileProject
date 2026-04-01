import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, FlatList, TouchableOpacity, ActivityIndicator, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { Ionicons } from '@expo/vector-icons';

export default function FindMatch() {
  const router = useRouter();
  const [allMatches, setAllMatches] = useState<any[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [minLevel, setMinLevel] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false); // Toon enkel matchen die niet volzet zijn
  const [typeFilter, setTypeFilter] = useState<'all' | 'comp' | 'rec'>('all');

  useEffect(() => {
    fetchMatches();
  }, []);

  // Update de lijst telkens als een filter verandert
  useEffect(() => {
    applyFilters();
  }, [minLevel, onlyAvailable, typeFilter, allMatches]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      // We halen alle matches op zonder de 'where' clause om Firestore-index problemen te voorkomen
      const querySnapshot = await getDocs(collection(db, 'matches'));
      const matches = querySnapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as any));

      // We filteren de gespeelde matches hier in de code
      const activeMatches = matches.filter(m => m.status !== 'played');
      
      setAllMatches(activeMatches);
      setFilteredMatches(activeMatches); // Zorg dat de lijst direct gevuld is
    } catch (error) {
      console.error("Fout bij ophalen matches:", error);
      Alert.alert("Fout", "Kon matchen niet ophalen.");
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let tempMatches = [...allMatches];

    // 1. Filter op Niveau
    if (minLevel !== '') {
      const levelNum = parseFloat(minLevel);
      tempMatches = tempMatches.filter(m => m.minLevel >= levelNum);
    }

    // 2. Filter op Beschikbaarheid (niet volzet)
    if (onlyAvailable) {
      tempMatches = tempMatches.filter(m => m.players?.length < 4);
    }

    // 3. Filter op Type
    if (typeFilter === 'comp') {
      tempMatches = tempMatches.filter(m => m.isCompetitive === true);
    } else if (typeFilter === 'rec') {
      tempMatches = tempMatches.filter(m => m.isCompetitive === false);
    }

    setFilteredMatches(tempMatches);
  };

  const renderMatchItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.matchCard} 
      onPress={() => router.push(`/match/${item.id}`)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.clubName}>{item.club}</Text>
        <Text style={styles.typeBadge}>{item.isCompetitive ? '🏆 Comp' : '🎾 Rec'}</Text>
      </View>
      <Text style={styles.dateText}>📅 {item.date}</Text>
      <View style={styles.cardFooter}>
        <Text style={styles.levelTag}>Niveau: {item.minLevel} - {item.maxLevel}</Text>
        <Text style={[styles.playerCount, item.players?.length === 4 && styles.fullText]}>
          👥 {item.players?.length}/4 spelers
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.title}>Zoek een match</Text>
      </View>

      {/* FILTER SECTIE */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Filters</Text>
        <View style={styles.row}>
          <TextInput
            style={styles.levelInput}
            placeholder="Min. Niveau (bv. 2.0)"
            placeholderTextColor="#999"
            keyboardType="numeric"
            value={minLevel}
            onChangeText={setMinLevel}
          />
          <TouchableOpacity 
            style={[styles.toggleBtn, onlyAvailable && styles.toggleBtnActive]}
            onPress={() => setOnlyAvailable(!onlyAvailable)}
          >
            <Text style={[styles.toggleText, onlyAvailable && styles.whiteText]}>Enkel vrije plekken</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.typeRow}>
          <TouchableOpacity 
            style={[styles.typeBtn, typeFilter === 'all' && styles.typeBtnActive]} 
            onPress={() => setTypeFilter('all')}
          >
            <Text style={typeFilter === 'all' && styles.whiteText}>Alles</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, typeFilter === 'comp' && styles.typeBtnActive]} 
            onPress={() => setTypeFilter('comp')}
          >
            <Text style={typeFilter === 'comp' && styles.whiteText}>🏆 Competitief</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.typeBtn, typeFilter === 'rec' && styles.typeBtnActive]} 
            onPress={() => setTypeFilter('rec')}
          >
            <Text style={typeFilter === 'rec' && styles.whiteText}>🎾 Recreatief</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4CAF50" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredMatches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatchItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>Geen matchen gevonden met deze filters.</Text>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: { paddingTop: 60, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingBottom: 15 },
  title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15 },
  filterSection: { backgroundColor: '#fff', padding: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  filterLabel: { fontSize: 14, fontWeight: 'bold', color: '#666', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  levelInput: { flex: 1, backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, marginRight: 10, color: '#000' },
  toggleBtn: { backgroundColor: '#f0f0f0', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd' },
  toggleBtnActive: { backgroundColor: '#4CAF50', borderColor: '#4CAF50' },
  toggleText: { fontSize: 12, fontWeight: 'bold' },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between' },
  typeBtn: { flex: 1, backgroundColor: '#f0f0f0', padding: 8, borderRadius: 8, alignItems: 'center', marginHorizontal: 2 },
  typeBtnActive: { backgroundColor: '#333' },
  whiteText: { color: '#fff' },
  list: { padding: 20 },
  matchCard: { backgroundColor: '#fff', padding: 18, borderRadius: 15, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  clubName: { fontSize: 17, fontWeight: 'bold' },
  typeBadge: { fontSize: 12, fontWeight: 'bold', color: '#666' },
  dateText: { color: '#007AFF', marginBottom: 10, fontWeight: '600' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 10 },
  levelTag: { fontSize: 13, color: '#444' },
  playerCount: { fontSize: 13, fontWeight: 'bold', color: '#666' },
  fullText: { color: '#D8000C' },
  empty: { textAlign: 'center', marginTop: 40, color: '#999', fontStyle: 'italic' }
});