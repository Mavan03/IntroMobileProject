import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, Switch, TouchableOpacity, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { PadelMatch } from '../models/PadelMatch';


export default function CreateMatch() {

  const router = useRouter();


  const [minLevel, setMinLevel] = useState<string>('1.5');
  const [maxLevel, setMaxLevel] = useState<string>('4.0');

  const [date, setDate] = useState<Date>(new Date());
  const [showPicker, setShowPicker] = useState<boolean>(false);

  const [club, setClub] = useState<string>('');
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [isCompetitive, setIsCompetitive] = useState<boolean>(false);

  const [errorMessage, setErrorMessage] = useState<string>('');

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const saveMatch = () => {
    let min = Number(minLevel);
    let max = Number(maxLevel);

    if (min > max) {
      setErrorMessage('Fout: Min niveau mag niet groter zijn dan max niveau.');
      return;
    }

    if (min < 0.5 || max > 7.0) {
      setErrorMessage('Fout: Niveau moet tussen 0.5 en 7 liggen.');
      return;
    }

    if (club.trim() === '') {
      setErrorMessage('Fout: Padelclub is verplicht.');
      return;
    }

    if (date.getTime() < new Date().getTime()) {
      setErrorMessage('Fout: Datum mag niet in het verleden liggen.');
      return;
    }

    setErrorMessage('');

    // Object opbouwen volgens de interface
    const newMatch: PadelMatch = {
      minLevel: min,
      maxLevel: max,
      date: date.toLocaleString('nl-NL'),
      club: club,
      isMixed: isMixed,
      isCompetitive: isCompetitive,
      players: []
    };

    console.log("Match opgeslagen:", newMatch);
    alert('Match aangemaakt op: ' + newMatch.date);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>← Terug</Text>
      </TouchableOpacity>

      <Text style={styles.header}>Nieuwe Wedstrijd</Text>

      {errorMessage !== '' && (
        <Text style={styles.errorText}>{errorMessage}</Text>
      )}

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Datum & Tijd:</Text>

        <TouchableOpacity style={styles.dateButton} onPress={() => setShowPicker(true)}>
          <Text style={styles.dateButtonText}>
            {date.toLocaleString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {showPicker && (
          <DateTimePicker
            value={date}
            mode="datetime"
            display="default"
            minimumDate={new Date()}
            onChange={onChangeDate}
          />
        )}
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Minimaal Niveau (0.5 - 7):</Text>
        <TextInput
          style={styles.input}
          value={minLevel}
          onChangeText={(text) => setMinLevel(text)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Maximaal Niveau (0.5 - 7):</Text>
        <TextInput
          style={styles.input}
          value={maxLevel}
          onChangeText={(text) => setMaxLevel(text)}
          keyboardType="numeric"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Padelclub:</Text>
        <TextInput
          style={styles.input}
          placeholder="Naam van de club"
          value={club}
          onChangeText={(text) => setClub(text)}
        />
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Gemengd (M/V)?</Text>
        <Switch value={isMixed} onValueChange={(val) => setIsMixed(val)} />
      </View>

      <View style={styles.switchGroup}>
        <Text style={styles.label}>Competitief?</Text>
        <Switch value={isCompetitive} onValueChange={(val) => setIsCompetitive(val)} />
      </View>

      <TouchableOpacity style={styles.button} onPress={saveMatch}>
        <Text style={styles.buttonText}>Aanmaken</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    padding: 20, 
    backgroundColor: '#fff', 
    flexGrow: 1 
  },
  header: { 
    fontSize: 24, 
    fontWeight: 'bold', 
    marginBottom: 20, 
    color: '#333' 
  },
  errorText: { 
    color: 'red', 
    backgroundColor: '#ffe6e6', 
    padding: 10, 
    borderRadius: 5, 
    marginBottom: 15, 
    fontWeight: 'bold' 
  },
  inputGroup: { 
    marginBottom: 15 
  },
  label: { 
    fontSize: 16, 
    marginBottom: 5, 
    color: '#555', 
    fontWeight: '600' 
  },
  input: { 
    borderWidth: 1, 
    borderColor: '#ccc', 
    borderRadius: 8, 
    padding: 12, 
    fontSize: 16, 
    backgroundColor: '#f9f9f9' 
  },
  dateButton: { 
    borderWidth: 1, 
    borderColor: '#007AFF', 
    backgroundColor: '#E5F1FF', 
    borderRadius: 8, 
    padding: 15, 
    alignItems: 'center' 
  },
  dateButtonText: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: '600' 
  },
  switchGroup: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 15, 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#eee' 
  },
  button: { 
    backgroundColor: '#4CAF50', 
    padding: 15, 
    borderRadius: 8, 
    alignItems: 'center', 
    marginTop: 20 
  },
  buttonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  backButton: { 
    marginBottom: 20, 
    paddingVertical: 10, 
    alignSelf: 'flex-start' 
  },
  backButtonText: { 
    color: '#007AFF', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
});