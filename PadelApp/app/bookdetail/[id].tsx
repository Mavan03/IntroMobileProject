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
// Kalender instellen op NL
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
  const { id, matchId } = useLocalSearchParams();
  const router = useRouter();
  const club = PADEL_CLUBS.find((c) => c.id === id);

  const [selectedDateStr, setSelectedDateStr] = useState("");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);

  // Betaalvelden (simulatie)
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
      if (club?.closedDays?.includes(dayIdx)) {
        marked[dateString] = {
          disabled: true,
          disableTouchEvent: true,
          textColor: "#d9e1e8",
        };
      }
    }
    if (selectedDateStr) {
      marked[selectedDateStr] = {
        ...marked[selectedDateStr],
        selected: true,
        selectedColor: "#4CAF50",
      };
    }
    return marked;
  }, [club, selectedDateStr]);

  useEffect(() => {
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
        console.error(e);
      } finally {
        setIsLoadingSlots(false);
      }
    };
    fetchBookings();
  }, [selectedDateStr, club]);

  const isToday = selectedDateStr === new Date().toISOString().split("T")[0];
  const currentHour = new Date().getHours();

  // knop werkt als alles is ingevuld (ongeacht lengte)
  const isFormFilled =
    selectedSlot &&
    cardNumber.trim() !== "" &&
    expiry.trim() !== "" &&
    cvv.trim() !== "";

  const handleBooking = async () => {
    if (!isFormFilled || !auth.currentUser) {
      Alert.alert("Incompleet", "Kies een tijdstip en vul de betaalvelden in.");
      return;
    }
    setIsBooking(true);

    try {
      const [h] = selectedSlot!.split(":");
      const [y, m, d] = selectedDateStr.split("-");
      const date = new Date(
        parseInt(y),
        parseInt(m) - 1,
        parseInt(d),
        parseInt(h),
      );

      // Sla de reservering op in de 'bookings' tabel
      await addDoc(collection(db, "bookings"), {
        clubId: club?.id,
        clubName: club?.name,
        userId: auth.currentUser.uid,
        dateTime: date.getTime(),
        displayDate: selectedDateStr,
        displayTime: selectedSlot,
      });

      // Als we via een match kwamen, update dan de match status
      if (matchId) {
        await updateDoc(doc(db, "matches", matchId as string), {
          isBooked: true,
        });
      }

      Alert.alert("Betaald!", "Je reservering is bevestigd.");
      router.replace("/");
    } catch (e) {
      Alert.alert("Fout", "Er ging iets mis.");
    } finally {
      setIsBooking(false);
    }
  };

  if (!club)
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{club.name}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Image source={{ uri: club.image }} style={styles.image} />
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>1. Kies een datum</Text>
          <Calendar
            firstDay={1}
            minDate={new Date().toISOString().split("T")[0]}
            onDayPress={(day: any) => setSelectedDateStr(day.dateString)}
            markedDates={markedDates}
            enableSwipeMonths={true}
            theme={{
              selectedDayBackgroundColor: "#4CAF50",
              todayTextColor: "#4CAF50",
              arrowColor: "#4CAF50",
            }}
            style={styles.calendar}
          />

          <Text style={styles.sectionTitle}>2. Kies een tijdstip</Text>
          {!selectedDateStr ? (
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>Kies eerst een dag.</Text>
            </View>
          ) : (
            <View style={styles.slotsGrid}>
              {Array.from(
                { length: (club.close === 0 ? 24 : club.close) - club.open },
                (_, i) => {
                  const slotHour = club.open + i;
                  const slot = `${slotHour}:00`;

                  const isBooked = bookedSlots.includes(slot);
                  // Check of dit uur vandaag al voorbij is
                  const isPast = isToday && slotHour <= currentHour;
                  const isSelected = selectedSlot === slot;
                  // De knop is disabled als hij geboekt is, óf als de tijd voorbij is
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

          <Text style={styles.sectionTitle}>3. Betaalgegevens (Simulatie)</Text>
          <View style={styles.paymentContainer}>
            <TextInput
              style={styles.input}
              placeholder="Kaartnummer"
              placeholderTextColor="#999"
              value={cardNumber}
              onChangeText={setCardNumber}
            />
            <View style={styles.row}>
              <TextInput
                style={[styles.input, { flex: 1, marginRight: 10 }]}
                placeholder="MM/JJ"
                placeholderTextColor="#999"
                value={expiry}
                onChangeText={setExpiry}
              />
              <TextInput
                style={[styles.input, { flex: 1 }]}
                placeholder="CVV"
                placeholderTextColor="#999"
                secureTextEntry
                value={cvv}
                onChangeText={setCvv}
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
              {isBooking ? "Bezig..." : "Betaal en reserveer"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  backBtn: { marginRight: 15 },
  backBtnText: { fontSize: 24, fontWeight: "bold" },
  headerTitle: { fontSize: 18, fontWeight: "bold" },
  image: { width: "100%", height: 160 },
  content: { padding: 20 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    marginTop: 10,
  },
  calendar: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 20,
  },
  infoBox: {
    padding: 15,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    alignItems: "center",
  },
  infoText: { color: "#999" },
  slotsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 10 },
  slot: {
    width: "31%",
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 10,
    marginRight: "2%",
  },
  selected: { backgroundColor: "#4CAF50", borderColor: "#4CAF50" },
  booked: { backgroundColor: "#f5f5f5" },
  slotText: { fontWeight: "bold", color: "#333" },
  whiteText: { color: "#fff" },
  grayText: { color: "#ccc", textDecorationLine: "line-through" },
  paymentContainer: {
    backgroundColor: "#f8f9fa",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  input: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    marginBottom: 10,
    color: "#000",
  },
  row: { flexDirection: "row" },
  bookBtn: {
    backgroundColor: "#4CAF50",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 25,
    marginBottom: 40,
  },
  bookBtnText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  disabledBtn: { backgroundColor: "#ccc" },
  center: { flex: 1, justifyContent: "center" },
});
