import React, { useState, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  Switch,
  TouchableOpacity,
  ScrollView,
  Platform,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { collection, addDoc } from "firebase/firestore";
import { auth, db } from "../config/firebaseConfig";
import { Ionicons } from "@expo/vector-icons";
import { PADEL_CLUBS } from "../data/clubs";
import { Calendar, LocaleConfig } from "react-native-calendars";

LocaleConfig.locales["nl"] = {
  monthNames: [
    "Januari",
    "Februari",
    "Maart",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Augustus",
    "September",
    "Oktober",
    "November",
    "December",
  ],
  monthNamesShort: [
    "Jan",
    "Feb",
    "Mrt",
    "Apr",
    "Mei",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Okt",
    "Nov",
    "Dec",
  ],
  dayNames: [
    "Zondag",
    "Maandag",
    "Dinsdag",
    "Woensdag",
    "Donderdag",
    "Vrijdag",
    "Zaterdag",
  ],
  dayNamesShort: ["Zo", "Ma", "Di", "Wo", "Do", "Vr", "Za"],
  today: "Vandaag",
};
LocaleConfig.defaultLocale = "nl";

export default function CreateMatch() {
  const router = useRouter();

  const [minLevel, setMinLevel] = useState<string>("1.5");
  const [maxLevel, setMaxLevel] = useState<string>("4.0");
  const [isMixed, setIsMixed] = useState<boolean>(false);
  const [isCompetitive, setIsCompetitive] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const [selectedClub, setSelectedClub] = useState<any>(null);
  const [showClubPicker, setShowClubPicker] = useState<boolean>(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const getCustomDayIndex = (date: Date) => {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    if (!selectedClub) return marked;

    const start = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(start.getDate() + i);
      const dateString = d.toISOString().split("T")[0];
      const dayIdx = getCustomDayIndex(d);

      // FIX: Vertel TypeScript expliciet dat dit een array van nummers is!
      const closedDays = (selectedClub?.closedDays as number[]) || [];

      if (closedDays.includes(dayIdx)) {
        marked[dateString] = {
          disabled: true,
          disableTouchEvent: true,
          textColor: "#334155",
        };
      }
    }
    if (selectedDateStr) {
      marked[selectedDateStr] = {
        ...marked[selectedDateStr],
        selected: true,
        selectedColor: "#00E676",
        selectedTextColor: "#0F172A",
      };
    }
    return marked;
  }, [selectedClub, selectedDateStr]);

  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();

  const saveMatch = async () => {
    let min = Number(minLevel);
    let max = Number(maxLevel);

    if (!selectedClub) {
      setErrorMessage("Fout: Selecteer eerst een padelclub.");
      return;
    }
    if (!selectedDateStr || !selectedSlot) {
      setErrorMessage("Fout: Kies een datum en tijd in de kalender.");
      return;
    }
    if (min > max) {
      setErrorMessage("Fout: Min niveau mag niet groter zijn dan max.");
      return;
    }
    if (min < 0.5 || max > 7.0) {
      setErrorMessage("Fout: Niveau moet tussen 0.5 en 7 liggen.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);

    try {
      const [h] = selectedSlot.split(":");
      const [y, m, d] = selectedDateStr.split("-");
      const exactDate = new Date(
        parseInt(y),
        parseInt(m) - 1,
        parseInt(d),
        parseInt(h),
        0,
        0,
      );
      const dateTimeMs = exactDate.getTime();
      const displayTimeStr = `${h}:00`;

      const matchRef = await addDoc(collection(db, "matches"), {
        creatorId: auth.currentUser?.uid || "onbekend",
        minLevel: min,
        maxLevel: max,
        date: `${parseInt(d)}-${parseInt(m)}-${y} ${displayTimeStr}`,
        club: selectedClub.name,
        clubId: selectedClub.id,
        isMixed: isMixed,
        isCompetitive: isCompetitive,
        players: [auth.currentUser?.uid || ""],
        status: "open",
        isBooked: false,
      });

      await addDoc(collection(db, "bookings"), {
        clubId: selectedClub.id,
        clubName: selectedClub.name,
        userId: auth.currentUser?.uid,
        dateTime: dateTimeMs,
        displayDate: selectedDateStr,
        displayTime: displayTimeStr,
        status: "pending",
        matchId: matchRef.id,
      });

      Alert.alert(
        "Succes",
        "Match is aangemaakt. Het veld is voorlopig gereserveerd!",
      );
      router.replace("/");
    } catch (error: any) {
      setErrorMessage("Fout: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Nieuwe match</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        {errorMessage !== "" && (
          <View style={styles.errorBox}>
            <Ionicons name="warning" size={20} color="#FFF" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>1. Kies een club</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setShowClubPicker(true)}
          activeOpacity={0.8}
        >
          <Text
            style={{
              color: selectedClub ? "#F8FAFC" : "#94A3B8",
              fontSize: 16,
              fontWeight: selectedClub ? "bold" : "normal",
            }}
          >
            {selectedClub ? selectedClub.name : "Selecteer een padelclub..."}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#94A3B8" />
        </TouchableOpacity>

        {selectedClub && (
          <>
            <Text style={styles.sectionTitle}>2. Kies een datum</Text>
            <Calendar
              firstDay={1}
              minDate={new Date().toISOString().split("T")[0]}
              onDayPress={(day: any) => {
                setSelectedDateStr(day.dateString);
                setSelectedSlot(null);
              }}
              markedDates={markedDates}
              enableSwipeMonths={true}
              theme={{
                calendarBackground: "#1E293B",
                textSectionTitleColor: "#94A3B8",

                dayTextColor: "#F8FAFC",

                textDisabledColor: "#334155",

                todayTextColor: "#00E676",
                monthTextColor: "#F8FAFC",
                arrowColor: "#00E676",
                textDayFontWeight: '400',
                textMonthFontWeight: 'bold',
              }}
              style={styles.calendar}
            />

            {selectedDateStr && (
              <>
                <Text style={styles.sectionTitle}>3. Kies een tijdstip</Text>
                <View style={styles.slotsGrid}>
                  {Array.from(
                    {
                      length:
                        (selectedClub.close === 0 ? 24 : selectedClub.close) -
                        selectedClub.open,
                    },
                    (_, i) => {
                      const slotHour = selectedClub.open + i;
                      const slot = `${slotHour}:00`;
                      const isPast = isToday && slotHour <= currentHour;
                      const isSelected = selectedSlot === slot;

                      return (
                        <TouchableOpacity
                          key={slot}
                          disabled={isPast}
                          onPress={() => setSelectedSlot(slot)}
                          style={[
                            styles.slot,
                            isPast && styles.booked,
                            isSelected && styles.selected,
                          ]}
                        >
                          <Text
                            style={[
                              styles.slotText,
                              isSelected && styles.whiteText,
                              isPast && styles.grayText,
                            ]}
                          >
                            {slot}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
              </>
            )}
          </>
        )}

        <Text style={styles.sectionTitle}>4. Matchdetails</Text>
        <View style={styles.detailsBox}>
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 0.48 }]}>
              <Text style={styles.label}>Min niveau</Text>
              <TextInput
                style={styles.input}
                value={minLevel}
                onChangeText={setMinLevel}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 0.48 }]}>
              <Text style={styles.label}>Max niveau</Text>
              <TextInput
                style={styles.input}
                value={maxLevel}
                onChangeText={setMaxLevel}
                keyboardType="number-pad"
                returnKeyType="done"
              />
            </View>
          </View>

          <View style={styles.switchGroup}>
            <Text style={styles.switchLabel}>Gemengd (M/V)</Text>
            <Switch
              value={isMixed}
              onValueChange={setIsMixed}
              trackColor={{ false: "#334155", true: "rgba(0, 230, 118, 0.4)" }}
              thumbColor={isMixed ? "#00E676" : "#94A3B8"}
            />
          </View>

          <View
            style={[
              styles.switchGroup,
              { borderBottomWidth: 0, paddingBottom: 0 },
            ]}
          >
            <Text style={styles.switchLabel}>Competitief</Text>
            <Switch
              value={isCompetitive}
              onValueChange={setIsCompetitive}
              trackColor={{ false: "#334155", true: "rgba(0, 230, 118, 0.4)" }}
              thumbColor={isCompetitive ? "#00E676" : "#94A3B8"}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.button, isLoading && { opacity: 0.7 }]}
          onPress={saveMatch}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? "Bezig..." : "Match aanmaken"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={showClubPicker} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Kies een club</Text>

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: 400 }}
            >
              {PADEL_CLUBS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.modalItem}
                  onPress={() => {
                    setSelectedClub(item);
                    setShowClubPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowClubPicker(false)}
            >
              <Text style={styles.modalCloseText}>Sluiten</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#1E293B",
  },
  backBtn: { marginRight: 15 },
  headerTitle: {
    fontSize: 24,
    fontWeight: "900",
    color: "#F8FAFC",
    letterSpacing: -0.5,
  },
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 20,
    color: "#F8FAFC",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EF4444",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: { color: "#FFF", fontWeight: "700", marginLeft: 8, flex: 1 },

  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 16,
    padding: 16,
    backgroundColor: "#1E293B",
  },
  calendar: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 5,
    overflow: "hidden",
  },

  slotsGrid: { flexDirection: "row", flexWrap: "wrap" },
  slot: {
    width: "31%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    marginRight: "2%",
    backgroundColor: "#1E293B",
  },
  selected: { backgroundColor: "#00E676", borderColor: "#00E676" },
  booked: { backgroundColor: "#0F172A", borderColor: "#1E293B" },
  slotText: { fontWeight: "800", color: "#F8FAFC", fontSize: 15 },
  whiteText: { color: "#0F172A" },
  grayText: { color: "#4B5563", textDecorationLine: "line-through" },

  detailsBox: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  inputGroup: { marginBottom: 5 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  label: { fontSize: 13, marginBottom: 8, color: "#94A3B8", fontWeight: "800" },
  input: {
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    backgroundColor: "#0F172A",
    color: "#F8FAFC",
    fontWeight: "700",
  },

  switchGroup: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  switchLabel: { fontSize: 15, fontWeight: "700", color: "#F8FAFC" },

  button: {
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 30,
    marginBottom: 40,
  },
  buttonText: { color: "#0F172A", fontSize: 18, fontWeight: "900" },

  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(15,23,42,0.9)",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    borderWidth: 1,
    borderColor: "#334155",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 20,
    textAlign: "center",
    color: "#F8FAFC",
  },
  modalItem: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  modalItemText: {
    fontSize: 17,
    textAlign: "center",
    color: "#F8FAFC",
    fontWeight: "600",
  },
  modalCloseButton: {
    marginTop: 20,
    padding: 18,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    alignItems: "center",
  },
  modalCloseText: { color: "#FFF", fontWeight: "900", fontSize: 16 },
});
