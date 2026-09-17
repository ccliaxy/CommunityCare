import 'package:flutter/foundation.dart';

class CareActivity {
  const CareActivity(
      this.id,
      this.title,
      this.time,
      this.location,
      this.description,
      );
  final String id;
  final String title;
  final String time;
  final String location;
  final String description;
}

class CareContact {
  const CareContact(this.name, this.relationship, this.phone);
  final String name;
  final String relationship;
  final String phone;
}

/// In-memory preview data. Replace with a repository when the backend is ready.
/// Nothing here sends an alert, places a call, or saves medical information.
class ElderlyDemoData extends ChangeNotifier {
  static const healthTalk = CareActivity(
    'health-talk',
    'Health Talk',
    'Friday · 10:00 AM',
    'Community Center',
    'Learn about heart health with your neighbours at the Community Center.',
  );
  static const activities = [
    healthTalk,
    CareActivity(
      'tech',
      'Tech Support Drop-in',
      'Saturday · 2:00 PM',
      'Library Room B',
      'Bring your phone and get help with everyday technology.',
    ),
    CareActivity(
      'yoga',
      'Morning Yoga',
      'Sunday · 8:30 AM',
      'Community Garden',
      'A gentle stretching session. All experience levels welcome.',
    ),
  ];
  static const contacts = [
    CareContact('Mei Ling', 'Daughter', '012-3456789'),
    CareContact('Wei Ming', 'Son', '012-9876543'),
    CareContact('Sarah Connor', 'Caregiver', '012-5550123'),
  ];
  final Set<String> _joined = {'tech'};
  bool _hasNewActivity = true;
  bool _reminderVisible = true;
  String? _mood;

  bool get hasNewActivity => _hasNewActivity;
  bool get reminderVisible => _reminderVisible;
  String? get mood => _mood;
  bool isJoined(CareActivity activity) => _joined.contains(activity.id);
  List<CareActivity> get joinedActivities =>
      activities.where(isJoined).toList(growable: false);

  void join(CareActivity activity) {
    final changed = _joined.add(activity.id);
    if (activity.id == healthTalk.id) _hasNewActivity = false;
    if (changed) notifyListeners();
  }

  void dismissInvitation() {
    _hasNewActivity = false;
    notifyListeners();
  }

  void dismissReminder() {
    _reminderVisible = false;
    notifyListeners();
  }

  void checkIn(String mood) {
    _mood = mood;
    notifyListeners();
  }

  void simulateNewActivity() {
    _joined.remove(healthTalk.id);
    _hasNewActivity = true;
    notifyListeners();
  }
}
