import React, { useState, useEffect, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Calendar, LocaleConfig } from "react-native-calendars";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db, auth } from "../../config/firebaseConfig";
import { PADEL_CLUBS } from "../../data/clubs";
import { Ionicons } from "@expo/vector-icons";

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

export default function BookDetail() {
  const { id, matchId, matchDate } = useLocalSearchParams();
  const router = useRouter();
  const club = PADEL_CLUBS.find((c) => c.id === id);

  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");

  const getCustomDayIndex = (date: Date) => {
    const jsDay = date.getDay();
    return jsDay === 0 ? 6 : jsDay - 1;
  };

  const markedDates = useMemo(() => {
    const marked: any = {};
    const start = new Date();
    for (let i = 0; i < 90; i++) {
      const d = new Date();
      d.setDate(start.getDate() + i);
      const dateString = d.toISOString().split("T")[0];
      const dayIdx = getCustomDayIndex(d);
      const closedDays = (club?.closedDays as number[]) || [];

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
  }, [club, selectedDateStr]);

  useEffect(() => {
    if (matchDate) return;
    const fetchBookings = async () => {
      if (!club || !selectedDateStr) return;
      setIsLoadingSlots(true);
      setSelectedSlot(null);
      try {
        const [y, m, d] = selectedDateStr.split("-");
        const startOfDay = new Date(
          parseInt(y),
          parseInt(m) - 1,
          parseInt(d),
          0,
          0,
          0,
        ).getTime();
        const endOfDay = new Date(
          parseInt(y),
          parseInt(m) - 1,
          parseInt(d),
          23,
          59,
          59,
        ).getTime();

        const q = query(
          collection(db, "bookings"),
          where("clubId", "==", club.id),
          where("dateTime", ">=", startOfDay),
          where("dateTime", "<=", endOfDay),
        );
        const snap = await getDocs(q);
        const booked: string[] = [];
        snap.forEach((doc) =>
          booked.push(`${new Date(doc.data().dateTime).getHours()}:00`),
        );
        setBookedSlots(booked);
      } catch (e) {
        console.error("Fout bij ophalen slots:", e);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchBookings();
  }, [selectedDateStr, club, matchDate]);

  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();

  const isFormFilled = matchDate
    ? cardNumber.trim().length > 0 &&
      expiry.trim().length > 0 &&
      cvv.trim().length > 0
    : selectedSlot !== null &&
      cardNumber.trim().length > 0 &&
      expiry.trim().length > 0 &&
      cvv.trim().length > 0;

  const handleBooking = async () => {
    if (!isFormFilled || !auth.currentUser) {
      Alert.alert("Incompleet", "Vul alle verplichte velden in.");
      return;
    }
    setIsBooking(true);
    try {
      let finalDateTime = 0;
      let finalDisplayDate = selectedDateStr;
      let finalDisplayTime = selectedSlot || "";

      if (matchDate) {
        const matchDateStr = matchDate as string;
        finalDisplayDate = matchDateStr.split(" ")[0] || "Onbekend";
        finalDisplayTime = matchDateStr.split(" ")[1] || "Onbekend";
        const parts = matchDateStr.match(/\d+/g);
        if (parts && parts.length >= 3) {
          finalDateTime = new Date(
            parseInt(parts[2]),
            parseInt(parts[1]) - 1,
            parseInt(parts[0]),
            parseInt(parts[3] || "0"),
            parseInt(parts[4] || "0"),
          ).getTime();
        }
      } else {
        const [h] = selectedSlot!.split(":");
        const [y, m, d] = selectedDateStr.split("-");
        finalDateTime = new Date(
          parseInt(y),
          parseInt(m) - 1,
          parseInt(d),
          parseInt(h),
        ).getTime();
      }

      await addDoc(collection(db, "bookings"), {
        clubId: club?.id,
        clubName: club?.name,
        userId: auth.currentUser.uid,
        dateTime: finalDateTime,
        displayDate: finalDisplayDate,
        displayTime: finalDisplayTime,
        status: "confirmed",
      });

      if (matchId) {
        try {
          await updateDoc(doc(db, "matches", matchId as string), {
            isBooked: true,
          });
        } catch (mErr) {
          console.log("Match update overgeslagen.");
        }
      }

      Alert.alert(
        "Succes",
        `Je hebt succesvol gereserveerd bij ${club?.name}!`,
        [{ text: "OK", onPress: () => router.replace("/") }],
      );
    } catch (e) {
      Alert.alert("Fout", "Er ging iets mis bij het opslaan.");
    } finally {
      setIsBooking(false);
    }
  };

  if (!club)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#00E676" />
      </View>
    );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={28} color="#F8FAFC" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{club.name}</Text>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <Image
              source={
                typeof club.image === "string"
                  ? { uri: club.image }
                  : club.image
              }
              style={styles.image}
            />
            <View style={styles.content}>
              {matchDate ? (
                <View style={styles.preBookedBox}>
                  <Text style={styles.preBookedTitle}>
                    Veld voor geplande match
                  </Text>
                  <View style={styles.preBookedRow}>
                    <Ionicons name="calendar-clear" size={20} color="#00E676" />
                    <Text style={styles.preBookedDate}>{matchDate}</Text>
                  </View>
                  <Text style={styles.infoText}>
                    Datum en tijd staan al vast voor deze match. Rond enkel de
                    betaling nog af.
                  </Text>
                </View>
              ) : (
                <View>
                  <Text style={styles.sectionTitle}>1. Kies een datum</Text>
                  <Calendar
                    firstDay={1}
                    minDate={new Date().toISOString().split("T")[0]}
                    onDayPress={(day: any) =>
                      setSelectedDateStr(day.dateString)
                    }
                    markedDates={markedDates}
                    enableSwipeMonths={true}
                    theme={{
                      calendarBackground: "#1E293B",
                      textSectionTitleColor: "#94A3B8",
                      dayTextColor: "#F8FAFC",
                      todayTextColor: "#00E676",
                      monthTextColor: "#F8FAFC",
                      arrowColor: "#00E676",
                    }}
                    style={styles.calendar}
                  />

                  <Text style={styles.sectionTitle}>2. Kies een tijdstip</Text>
                  {!selectedDateStr ? (
                    <View style={styles.infoBox}>
                      <Text style={styles.infoTextEmpty}>
                        Kies eerst een dag in de kalender.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.slotsGrid}>
                      {Array.from(
                        {
                          length:
                            (club.close === 0 ? 24 : club.close) - club.open,
                        },
                        (_, i) => {
                          const slotHour = club.open + i;
                          const slot = `${slotHour}:00`;
                          const isBooked = bookedSlots.includes(slot);
                          const isPast = isToday && slotHour <= currentHour;
                          const isSelected = selectedSlot === slot;
                          const isDisabled = isBooked || isPast;

                          return (
                            <TouchableOpacity
                              key={slot}
                              disabled={isDisabled}
                              onPress={() => setSelectedSlot(slot)}
                              style={[
                                styles.slot,
                                isDisabled && styles.booked,
                                isSelected && styles.selected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.slotText,
                                  isSelected && styles.whiteText,
                                  isDisabled && styles.grayText,
                                ]}
                              >
                                {slot}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>
                  )}
                </View>
              )}

              <Text style={styles.sectionTitle}>
                {matchDate ? "1" : "3"}. Betaalgegevens
              </Text>
              <View style={styles.paymentContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Kaartnummer"
                  placeholderTextColor="#64748B"
                  value={cardNumber}
                  onChangeText={setCardNumber}
                  keyboardType="number-pad"
                  returnKeyType="done"
                />
                <View style={styles.row}>
                  <TextInput
                    style={[styles.input, { flex: 1, marginRight: 10 }]}
                    placeholder="MM/JJ"
                    placeholderTextColor="#64748B"
                    value={expiry}
                    onChangeText={setExpiry}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                  <TextInput
                    style={[styles.input, { flex: 1 }]}
                    placeholder="CVV"
                    placeholderTextColor="#64748B"
                    secureTextEntry
                    value={cvv}
                    onChangeText={setCvv}
                    keyboardType="number-pad"
                    returnKeyType="done"
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.bookBtn,
                  (!isFormFilled || isBooking) && styles.disabledBtn,
                ]}
                onPress={handleBooking}
                disabled={!isFormFilled || isBooking}
              >
                <Text style={styles.bookBtnText}>
                  {isBooking ? "Bezig met verwerken..." : "Betaal en reserveer"}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
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
  image: { width: "100%", height: 180 },
  content: { padding: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "900",
    marginBottom: 12,
    marginTop: 10,
    color: "#F8FAFC",
  },
  preBookedBox: {
    backgroundColor: "rgba(0, 230, 118, 0.1)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 230, 118, 0.3)",
  },
  preBookedTitle: {
    fontSize: 14,
    color: "#00E676",
    fontWeight: "800",
    marginBottom: 8,
  },
  preBookedRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  preBookedDate: {
    fontSize: 20,
    fontWeight: "900",
    color: "#F8FAFC",
    marginLeft: 8,
  },
  calendar: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 24,
    overflow: "hidden",
  },
  infoBox: {
    padding: 15,
    backgroundColor: "#1E293B",
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#334155",
  },
  infoTextEmpty: { color: "#94A3B8", fontSize: 14, fontWeight: "600" },
  infoText: {
    color: "#E2E8F0",
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  slot: {
    width: "31%",
    padding: 12,
    borderWidth: 1,
    borderColor: "#334155",
    backgroundColor: "#1E293B",
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
    marginRight: "2%",
  },
  selected: { backgroundColor: "#00E676", borderColor: "#00E676" },
  booked: { backgroundColor: "#0F172A", borderColor: "#0F172A" },
  slotText: { fontWeight: "800", color: "#F8FAFC", fontSize: 15 },
  whiteText: { color: "#0F172A" },
  grayText: { color: "#4B5563", textDecorationLine: "line-through" },
  paymentContainer: {
    backgroundColor: "#1E293B",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 24,
  },
  input: {
    backgroundColor: "#0F172A",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 12,
    color: "#F8FAFC",
    fontWeight: "700",
    fontSize: 16,
  },
  row: { flexDirection: "row" },
  bookBtn: {
    backgroundColor: "#00E676",
    padding: 18,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 40,
  },
  bookBtnText: { color: "#0F172A", fontWeight: "900", fontSize: 16 },
  disabledBtn: { opacity: 0.5 },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#0F172A",
  },
});
