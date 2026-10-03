import 'package:flutter/foundation.dart';

class FamilyContact {
  FamilyContact(this.name, this.relationship, this.phone);
  final String name;
  final String relationship;
  final String phone;
}

class FamilyReminder {
  FamilyReminder(this.title, this.time);
  final String title;
  final String time;
}

class FamilyResident {
  FamilyResident({
    required this.id,
    required this.name,
    required this.unit,
    required this.details,
    required this.address,
    required this.phone,
    required this.email,
    required this.checkedIn,
    required this.reminders,
  });
  final String id;
  String name;
  final String unit;
  final String details;
  String address;
  String phone;
  String email;
  final bool checkedIn;
  final List<FamilyReminder> reminders;
  final List<FamilyContact> contacts = [
    FamilyContact('Dr. Sarah Jenkins', 'Primary Physician', '555-0199'),
    FamilyContact('Mark Johnson', 'Son', '555-0102'),
  ];
  final List<String> phrases = ['Call Doctor', 'Help Me'];
  bool alertsEnabled = true;
  bool voiceReminders = true;
  double radius = 500;
}

/// In-memory sample data only. No calls, alerts, location or medical services.
class FamilyDemoData extends ChangeNotifier {
  final residents = [
    FamilyResident(
      id: '12345',
      name: 'Tan Ah Beng',
      unit: 'A-102',
      details: 'Age: 78 • Male',
      address: '123 Meadow Lane',
      phone: '555-0123',
      email: 'ahbeng22@example.com',
      checkedIn: true,
      reminders: [FamilyReminder('Take blood pressure medication', '18:00')],
    ),
    FamilyResident(
      id: '12346',
      name: 'Eleanor Tay',
      unit: 'B-305',
      details: 'Sample resident',
      address: 'Unit B-305',
      phone: '555-0145',
      email: 'eleanor@example.com',
      checkedIn: false,
      reminders: [FamilyReminder('Evening Walk & Vitamins', '20:00')],
    ),
  ];
  int _selected = 0;
  int get selectedIndex => _selected;
  FamilyResident get selected => residents[_selected];
  void select(int index) {
    _selected = index;
    notifyListeners();
  }

  void updateProfile(FamilyResident resident, List<String> fields) {
    resident.name = fields[0];
    resident.address = fields[1];
    resident.phone = fields[2];
    resident.email = fields[3];
    notifyListeners();
  }

  void addContact(FamilyResident resident, FamilyContact contact) {
    resident.contacts.add(contact);
    notifyListeners();
  }

  void removeContact(FamilyResident resident, FamilyContact contact) {
    resident.contacts.remove(contact);
    notifyListeners();
  }

  void setAlerts(FamilyResident resident, bool value) {
    resident.alertsEnabled = value;
    notifyListeners();
  }

  void setVoiceReminders(FamilyResident resident, bool value) {
    resident.voiceReminders = value;
    notifyListeners();
  }

  void setRadius(FamilyResident resident, double value) {
    resident.radius = value;
    notifyListeners();
  }

  bool addPhrase(FamilyResident resident, String phrase) {
    if (resident.phrases.any(
      (entry) => entry.toLowerCase() == phrase.toLowerCase(),
    ))
      return false;
    resident.phrases.add(phrase);
    notifyListeners();
    return true;
  }

  void removePhrase(FamilyResident resident, String phrase) {
    resident.phrases.remove(phrase);
    notifyListeners();
  }

  void addReminder(FamilyResident resident, FamilyReminder reminder) {
    resident.reminders.add(reminder);
    resident.reminders.sort((a, b) => a.time.compareTo(b.time));
    notifyListeners();
  }

  void removeReminder(FamilyResident resident, FamilyReminder reminder) {
    resident.reminders.remove(reminder);
    notifyListeners();
  }
}
