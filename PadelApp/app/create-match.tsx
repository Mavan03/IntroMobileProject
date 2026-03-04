import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ScrollView, Platform } from 'react-native';
// 1. Importeer de nieuwe DatePicker
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';

export default function CreateMatch() {

  const router = useRouter();
  
  const [minLevel, setMinLevel] = useState('1.5');
  const [maxLevel, setMaxLevel] = useState('4.0');
  
  // 2. STATE VOOR DE DATUM
  // We gebruiken nu een echt Date object, standaard ingesteld op "nu"
  const [date, setDate] = useState(new Date());
  // State om te bepalen of de kalender popup zichtbaar is of niet
  const [showPicker, setShowPicker] = useState(false);

  const [club, setClub] = useState('');
  const [isMixed, setIsMixed] = useState(false);
  const [isCompetitive, setIsCompetitive] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Functie die wordt aangeroepen als je een datum kiest in de kalender
  const onChangeDate = (event: any, selectedDate?: Date) => {
    // Op Android sluit de kalender na het kiezen, op iOS niet altijd vanzelf
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }
    
    // Als de gebruiker iets gekozen heeft, slaan we het op in de state
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const handleCreateMatch = () => {
    const min = parseFloat(minLevel);
    const max = parseFloat(maxLevel);

    if (min > max) {
      setErrorMessage('Fout: Het minimale niveau mag niet hoger zijn dan het maximale niveau.');
      return;
    }

    if (min < 0.5 || max > 7.0) {
      setErrorMessage('Fout: Het niveau moet tussen 0.5 en 7.0 liggen.');
      return;
    }

    if (club.trim() === '') {
      setErrorMessage('Fout: Vul de padelclub in.');
      return;
    }

    // Extra check in de code: is de gekozen datum in het verleden?
    // (Hoewel de minimumDate prop in de kalender dit ook al tegenhoudt)
    if (date < new Date()) {
      setErrorMessage('Fout: Je kunt geen wedstrijd in het verleden plannen.');
      return;
    }

    setErrorMessage('');

    const newMatch = {
      minLevel: min,
      maxLevel: max,
      // We zetten het Date object om naar een leesbare tekst voor in de database
      date: date.toLocaleString('nl-NL'), 
      club: club,
      isMixed: isMixed,
      isCompetitive: isCompetitive,
      players: [] 
    };

    console.log("Nieuwe match data:", newMatch);
    alert('Wedstrijd succesvol opgeslagen op: ' + newMatch.date);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()} // Brengt je terug naar index.tsx
      >
        <Text style={styles.backButtonText}>← Terug naar Dashboard</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Nieuwe Wedstrijd</Text>

      {errorMessage !== '' && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      {/* Datum & Tijd Kiezer */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Datum & Tijd:</Text>
        
        {/* We gebruiken een knop om de kalender te openen */}
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.dateButtonText}>
            {date.toLocaleString('nl-NL', { 
              weekday: 'short', 
              day: 'numeric', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </Text>
        </TouchableOpacity>

        {/* CONDITIONAL RENDERING: Toon kalender alleen als showPicker true is */}
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="datetime" // Zorgt dat je zowel datum als tijd kunt kiezen
            display="default"
            minimumDate={new Date()} // ZORGT DAT HET VERLEDEN GEBLOKKEERD IS
            onChange={onChangeDate}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Minimaal Niveau (0.5 - 7):</Text>
        <TextInput style={styles.input} value={minLevel} onChangeText={setMinLevel} keyboardType="numeric" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maximaal Niveau (0.5 - 7):</Text>
        <TextInput style={styles.input} value={maxLevel} onChangeText={setMaxLevel} keyboardType="numeric" />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Padelclub:</Text>
        <TextInput style={styles.input} placeholder="Naam van de club" value={club} onChangeText={setClub} />
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Gemengd (M/V)?</Text>
        <Switch value={isMixed} onValueChange={setIsMixed} />
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Competitief?</Text>
        <Switch value={isCompetitive} onValueChange={setIsCompetitive} />
      </View>

      <TouchableOpacity style={styles.button} onPress={handleCreateMatch}>
        <Text style={styles.buttonText}>Aanmaken</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flexGrow: 1 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
  errorText: { color: 'red', backgroundColor: '#ffe6e6', padding: 10, borderRadius: 5, marginBottom: 15, fontWeight: 'bold' },
  inputGroup: { marginBottom: 15 },
  label: { fontSize: 16, marginBottom: 5, color: '#555', fontWeight: '600' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  
  // Nieuwe styling voor de datumknop
  dateButton: {
    borderWidth: 1,
    borderColor: '#007AFF', // Blauwe rand zodat het op een knop lijkt
    backgroundColor: '#E5F1FF',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  dateButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },

  switchGroup: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  button: { backgroundColor: '#4CAF50', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  // Voeg dit toe aan je styles object:
  backButton: {
    marginBottom: 20,
    paddingVertical: 10,
    alignSelf: 'flex-start', // Zorgt dat de knop niet de hele breedte inneemt
  },
  backButtonText: {
    color: '#007AFF', // Mooie 'klikbare' blauwe kleur
    fontSize: 16,
    fontWeight: 'bold',
  },
});