import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ScrollView, Platform, Modal, FlatList } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { collection, addDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { PadelMatch } from '../models/PadelMatch'; // Zorg dat deze nog goed staat!

// Onze vaste lijst met clubs (alleen de namen zijn hier nodig)
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
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  
  // States voor onze nieuwe dropdown
  const [club, setClub] = useState<string>('');
  const [showClubPicker, setShowClubPicker] = useState<boolean>(false);
  
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [isCompetitive, setIsCompetitive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') setShowDatePicker(false);
    if (selectedDate) setDate(selectedDate);
  };

  const saveMatch = async () => {
    let min = Number(minLevel);
    let max = Number(maxLevel);

    if (min > max) { setErrorMessage('Fout: Min niveau mag niet groter zijn dan max.'); return; }
    if (min < 0.5 || max > 7.0) { setErrorMessage('Fout: Niveau moet tussen 0.5 en 7 liggen.'); return; }
    if (club === '') { setErrorMessage('Fout: Selecteer een padelclub a niffo!'); return; }
    if (date.getTime() < new Date().getTime()) { setErrorMessage('Fout: Datum mag niet in het verleden liggen.'); return; }

    setErrorMessage('');
    setIsLoading(true);

    const newMatch: PadelMatch = {
      creatorId: auth.currentUser?.uid || 'onbekend',
      minLevel: min,
      maxLevel: max,
      date: date.toLocaleString('nl-NL'), 
      club: club,
      isMixed: isMixed,
      isCompetitive: isCompetitive,
      players: [auth.currentUser?.uid || ''] 
    };

    try {
      const docRef = await addDoc(collection(db, 'matches'), newMatch);
      alert('Match succesvol aangemaakt!');
      router.back(); 
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage('Kon match niet opslaan: ' + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Terug</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Nieuwe Wedstrijd</Text>

      {errorMessage !== '' && <Text style={styles.errorText}>{errorMessage}</Text>}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Datum & Tijd:</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateButtonText}>
            {date.toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker value={date} mode="datetime" display="default" minimumDate={new Date()} onChange={onChangeDate} />
        )}
      </View>

      {/* NIEUW: De Club Dropdown Knop */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Padelclub:</Text>
        <TouchableOpacity 
          style={styles.dropdownButton} 
          onPress={() => setShowClubPicker(true)}
        >
          <Text style={{ color: club ? '#333' : '#999', fontSize: 16 }}>
            {club !== '' ? club : 'Kies een club uit de lijst...'}
          </Text>
          <Text style={{ color: '#999' }}>▼</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.row}>
        <View style={[styles.inputGroup, { flex: 0.48 }]}>
          <Text style={styles.label}>Min Niveau:</Text>
          <TextInput style={styles.input} value={minLevel} onChangeText={setMinLevel} keyboardType="numeric" />
        </View>
        <View style={[styles.inputGroup, { flex: 0.48 }]}>
          <Text style={styles.label}>Max Niveau:</Text>
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

      <TouchableOpacity 
        style={[styles.button, isLoading && { backgroundColor: '#A0CFFF' }]} 
        onPress={saveMatch}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>{isLoading ? 'Bezig...' : 'Aanmaken'}</Text>
      </TouchableOpacity>

      {/* NIEUW: Het onzichtbare schermpje (Modal) dat omhoog komt voor de clubs */}
      <Modal visible={showClubPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Selecteer een Club</Text>
            
            <FlatList
              data={PADEL_CLUBS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity 
                  style={styles.modalItem}
                  onPress={() => {
                    setClub(item); // Sla de gekozen club op
                    setShowClubPicker(false); // Sluit de modal
                  }}
                >
                  <Text style={styles.modalItemText}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setShowClubPicker(false)}>
              <Text style={styles.modalCloseText}>Annuleren</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  header: { fontSize: 28, fontWeight: '900', marginBottom: 25, color: '#1a1a1a', marginTop: 10 },
  errorText: { color: '#D8000C', backgroundColor: '#FFD2D2', padding: 10, borderRadius: 8, marginBottom: 15, fontWeight: 'bold', overflow: 'hidden' },
  
  inputGroup: { marginBottom: 15 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 15, marginBottom: 6, color: '#555', fontWeight: '700' },
  
  input: { borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 15, fontSize: 16, backgroundColor: '#FAFAFA', color: '#333' },
  
  dateButton: { borderWidth: 1.5, borderColor: '#007AFF', backgroundColor: '#E5F1FF', borderRadius: 12, padding: 15, alignItems: 'center' },
  dateButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '700' },
  
  // Styling voor de Dropdown knop
  dropdownButton: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1.5, borderColor: '#E0E0E0', borderRadius: 12, padding: 15, backgroundColor: '#FAFAFA' },

  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  
  button: { backgroundColor: '#4CAF50', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 25, shadowColor: '#4CAF50', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  
  backButton: { marginBottom: 10, paddingVertical: 10, alignSelf: 'flex-start', marginTop: 30 },
  backButtonText: { color: '#007AFF', fontSize: 16, fontWeight: 'bold' },

  // STYLING VOOR DE MODAL (DROPDOWN SCHERMPJE)
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, color: '#333', textAlign: 'center' },
  modalItem: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalItemText: { fontSize: 16, color: '#333', textAlign: 'center' },
  modalCloseButton: { marginTop: 20, padding: 15, backgroundColor: '#FF3B30', borderRadius: 12, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});