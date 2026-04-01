import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ScrollView, Platform, Modal, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { PadelMatch } from '../models/PadelMatch';
import { Ionicons } from '@expo/vector-icons';

const PADEL_CLUBS = [
  'Ter Eiken Padel', 'Garrincha Antwerpen', 'Padelclub de Uitkijk', 'Vibora',
  'Arenal Antwerpen', 'Padelschool ChiKita', 'Club Cabane', 'Padelland Indoor Linkeroever',
  'T.C. Laagland | Tennis & Padel', 'Padboltopia', 'Padel Air', 'Antwerp Padelclub',
  'Antwerp Padel Club - Olympiade', 'TC Ruggeveld', 'Our Service Is Ace', 
  'Focus Tennis Academy Ekeren', 'TC Raffic II', 'Borgerweert Tennis & Padel', 
  'Bouncewear', 'Tennisclub Beerschot'
];

export default function CreateMatch() {
  const router = useRouter();
  
  const [minLevel, setMinLevel] = useState<string>('1.5');
  const [maxLevel, setMaxLevel] = useState<string>('4.0');
  const [date, setDate] = useState<Date>(new Date());
  
  const [showPicker, setShowPicker] = useState<boolean>(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  
  const [club, setClub] = useState<string>('');
  const [showClubPicker, setShowClubPicker] = useState<boolean>(false);
  
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [isCompetitive, setIsCompetitive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onChangeDateTime = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowPicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const openPicker = (mode: 'date' | 'time') => {
    setPickerMode(mode);
    setShowPicker(true);
  };

  const saveMatch = async () => {
    let min = Number(minLevel);
    let max = Number(maxLevel);

    if (min > max) { setErrorMessage('Fout: Min niveau mag niet groter zijn dan max.'); return; }
    if (min < 0.5 || max > 7.0) { setErrorMessage('Fout: Niveau moet tussen 0.5 en 7 liggen.'); return; }
    if (club === '') { setErrorMessage('Fout: Selecteer een padelclub.'); return; }
    if (date.getTime() < new Date().getTime()) { setErrorMessage('Fout: Datum mag niet in het verleden liggen.'); return; }

    setErrorMessage('');
    setIsLoading(true);

    const newMatch: PadelMatch = {
      creatorId: auth.currentUser?.uid || 'onbekend',
      minLevel: min,
      maxLevel: max,
      date: `${date.getDate()}-${date.getMonth() + 1}-${date.getFullYear()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`,
      club: club,
      isMixed: isMixed,
      isCompetitive: isCompetitive,
      players: [auth.currentUser?.uid || ''],
      status: 'open'
    };

    try {
      await addDoc(collection(db, 'matches'), newMatch);
      alert('Match succesvol aangemaakt!');
      router.back(); 
    } catch (error) {
      if (error instanceof Error) setErrorMessage('Fout: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>

      <Text style={styles.header}>Nieuwe wedstrijd</Text>

      {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Wanneer ga je spelen?</Text>
        <View style={styles.row}>
          <TouchableOpacity style={[styles.dateTimeBtn, { flex: 0.55 }]} onPress={() => openPicker('date')}>
            <Text style={styles.labelSmall}>Datum</Text>
            <Text style={styles.dateTimeText}>{date.toLocaleDateString('nl-NL')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.dateTimeBtn, { flex: 0.40 }]} onPress={() => openPicker('time')}>
            <Text style={styles.labelSmall}>Uur</Text>
            <Text style={styles.dateTimeText}>
              {date.getHours()}:{date.getMinutes().toString().padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        </View>
        
        {showPicker && (
          <View style={styles.pickerContainer}>
            <DateTimePicker 
              value={date} 
              mode={pickerMode} 
              display={Platform.OS === 'ios' ? 'spinner' : 'default'} 
              is24Hour={true} 
              minimumDate={new Date()} 
              onChange={onChangeDateTime}
              textColor="#000000"
            />
            {Platform.OS === 'ios' && (
              <TouchableOpacity onPress={() => setShowPicker(false)} style={styles.closePickerBtn}>
                <Text style={styles.closePickerText}>Gereed</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Padelclub:</Text>
        <TouchableOpacity style={styles.dropdownButton} onPress={() => setShowClubPicker(true)}>
          <Text style={{ color: club ? '#333' : '#999', fontSize: 16 }}>
            {club !== '' ? club : 'Kies een club...'}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 0.48 }]}>
          <Text style={styles.label}>Min niveau:</Text>
          <TextInput style={styles.input} value={minLevel} onChangeText={setMinLevel} keyboardType="numeric" />
        </View>
        <View style={[styles.inputGroup, { flex: 0.48 }]}>
          <Text style={styles.label}>Max niveau:</Text>
          <TextInput style={styles.input} value={maxLevel} onChangeText={setMaxLevel} keyboardType="numeric" />
        </View>
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Gemengd (M/V)?</Text>
        <Switch value={isMixed} onValueChange={setIsMixed} trackColor={{ false: '#767577', true: '#81b0ff' }} thumbColor={isMixed ? '#007AFF' : '#f4f3f4'} />
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Competitief?</Text>
        <Switch value={isCompetitive} onValueChange={setIsCompetitive} trackColor={{ false: '#767577', true: '#81b0ff' }} thumbColor={isCompetitive ? '#007AFF' : '#f4f3f4'} />
      </View>

      <TouchableOpacity style={[styles.button, isLoading && { backgroundColor: '#A0CFFF' }]} onPress={saveMatch} disabled={isLoading}>
        <Text style={styles.buttonText}>{isLoading ? 'Bezig...' : 'Match aanmaken'}</Text>
      </TouchableOpacity>

      <Modal visible={showClubPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecteer een club</Text>
            <FlatList
              data={PADEL_CLUBS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.modalItem} onPress={() => { setClub(item); setShowClubPicker(false); }}>
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowClubPicker(false)}>
              <Text style={styles.modalCloseText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  header: { fontSize: 26, fontWeight: '900', marginBottom: 20, color: '#1a1a1a', marginTop: 10 },
  errorText: { color: '#D8000C', backgroundColor: '#FFD2D2', padding: 10, borderRadius: 8, marginBottom: 15, fontWeight: 'bold', textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 14, marginBottom: 8, color: '#666', fontWeight: '700' },
  labelSmall: { fontSize: 10, color: '#007AFF', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 12, fontSize: 16, backgroundColor: '#FAFAFA', color: '#333' },
  dateTimeBtn: { borderWidth: 1.5, borderColor: '#007AFF', backgroundColor: '#F0F7FF', borderRadius: 12, padding: 12 },
  dateTimeText: { color: '#333', fontSize: 16, fontWeight: 'bold' },
  pickerContainer: { backgroundColor: '#F0F0F0', borderRadius: 15, marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#ddd', overflow: 'hidden' },
  closePickerBtn: { alignItems: 'center', padding: 10, backgroundColor: '#ddd', borderRadius: 10, marginTop: 5 },
  closePickerText: { fontWeight: 'bold', color: '#007AFF' },
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 15, backgroundColor: '#FAFAFA' },
  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  button: { backgroundColor: '#4CAF50', padding: 18, borderRadius: 15, alignItems: 'center', marginTop: 20, marginBottom: 40 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  backButton: { marginBottom: 10, marginTop: 30, width: 40 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 25, borderTopRightRadius: 25, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center', color: '#333' },
  modalItem: { paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  modalItemText: { fontSize: 17, textAlign: 'center', color: '#444' },
  modalCloseButton: { marginTop: 15, padding: 16, backgroundColor: '#333', borderRadius: 12, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: 'bold' },
});