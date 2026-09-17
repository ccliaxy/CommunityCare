import 'package:flutter/material.dart';
import 'elderly_activity_page.dart';
import 'elderly_demo_data.dart';
import 'elderly_home_page.dart';
import 'elderly_profile_page.dart';
import 'elderly_safety_page.dart';
import 'elderly_widgets.dart';
import 'new_activity_dialog.dart';

/// Push this route from login for a UI preview. This is not authentication.
class ElderlyShell extends StatefulWidget {
  const ElderlyShell({
    super.key,
    this.showInitialInvitation = true,
    this.onLogout,
  });
  final bool showInitialInvitation;
  final VoidCallback? onLogout;
  @override
  State<ElderlyShell> createState() => _ElderlyShellState();
}

class _ElderlyShellState extends State<ElderlyShell> {
  ElderlyDemoData _data = ElderlyDemoData();
  int _index = 0;
  bool _dialogOpen = false;
  BuildContext? _themedContext;
  static const _labels = ['Home', 'Safety', 'Activity', 'Profile'];

  @override
  void initState() {
    super.initState();
    // A single simulated incoming event, never triggered again by a rebuild.
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && widget.showInitialInvitation) _showInvitation();
    });
  }

  Future<void> _showInvitation() async {
    if (_dialogOpen || !mounted || _themedContext == null) return;
    _dialogOpen = true;
    try {
      final join = await showNewActivityDialog(
        _themedContext!,
        ElderlyDemoData.healthTalk,
      );
      if (!mounted) return;
      if (join == true) {
        _data.join(ElderlyDemoData.healthTalk);
        careMessage(
          _themedContext!,
          'Health Talk added to your demo activities.',
        );
      } else {
        _data.dismissInvitation();
      }
    } finally {
      _dialogOpen = false;
    }
  }

  void _notifications() {
    if (_data.hasNewActivity) {
      _showInvitation();
    } else {
      showDemoInfo(
        _themedContext!,
        'You’re all caught up',
        'No new activity invitations. Use “Demo event” to simulate another notification.',
      );
    }
  }

  void _simulateEvent() {
    if (_dialogOpen) return;
    _data.simulateNewActivity();
    _showInvitation();
  }

  void _logout() {
    if (widget.onLogout != null) {
      widget.onLogout!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      // Standalone preview has no login route. Reset instead of popping the app.
      final oldData = _data;
      setState(() {
        _data = ElderlyDemoData();
        _index = 0;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => oldData.dispose());
      careMessage(
        _themedContext!,
        'Demo session reset. No login service is connected.',
      );
    }
  }

  @override
  void dispose() {
    _data.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Theme(
    data: elderlyTheme(),
    child: Builder(
      builder: (context) {
        _themedContext = context;
        return ListenableBuilder(
          listenable: _data,
          builder: (context, _) => Scaffold(
            appBar: AppBar(
              backgroundColor: careCream,
              surfaceTintColor: Colors.transparent,
              titleSpacing: 20,
              title: Row(
                children: [
                  // 只在 Home 页显示 logo。
                  if (_index == 0) ...[
                    Image.asset(
                      'assets/images/communitycare_logo.png',
                      width: 36,
                      height: 36,
                      fit: BoxFit.contain,
                      excludeFromSemantics: true,
                    ),
                    const SizedBox(width: 10),
                  ],

                  Expanded(
                    child: Text(
                      _index == 0 ? 'CommunityCare' : _labels[_index],
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        fontWeight: FontWeight.w800,
                        fontSize: 23,
                        color: careGreen,
                      ),
                    ),
                  ),
                ],
              ),
              actions: [
                IconButton(
                  tooltip: 'Activity notifications',
                  key: const ValueKey('notifications'),
                  onPressed: _notifications,
                  icon: Badge(
                    isLabelVisible: _data.hasNewActivity,
                    child: const Icon(Icons.notifications_none_rounded),
                  ),
                ),
                const SizedBox(width: 8),
              ],
            ),
            body: SafeArea(
              top: false,
              bottom: false,
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    color: const Color(0xFFEAF0E4),
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 4,
                    ),
                    child: Wrap(
                      alignment: WrapAlignment.spaceBetween,
                      crossAxisAlignment: WrapCrossAlignment.center,
                      spacing: 8,
                      children: [
                        const Text(
                          'UI preview · Sample data',
                          style: TextStyle(fontSize: 13, color: careGreen),
                        ),
                        TextButton.icon(
                          key: const ValueKey('demo-event'),
                          onPressed: _simulateEvent,
                          icon: const Icon(Icons.add_alert_outlined, size: 18),
                          label: const Text('Demo event'),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: IndexedStack(
                      index: _index,
                      children: [
                        ElderlyHomePage(
                          data: _data,
                          onActivities: () => setState(() => _index = 2),
                        ),
                        const ElderlySafetyPage(),
                        ElderlyActivityPage(data: _data),
                        ElderlyProfilePage(onLogout: _logout),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            bottomNavigationBar: NavigationBar(
              selectedIndex: _index,
              onDestinationSelected: (index) => setState(() => _index = index),
              backgroundColor: const Color(0xFFF1F5E9),
              indicatorColor: const Color(0xFFD4E8C9),
              destinations: const [
                NavigationDestination(
                  icon: Icon(Icons.home_outlined),
                  selectedIcon: Icon(Icons.home_rounded),
                  label: 'Home',
                ),
                NavigationDestination(
                  icon: Icon(Icons.shield_outlined),
                  selectedIcon: Icon(Icons.shield_rounded),
                  label: 'Safety',
                ),
                NavigationDestination(
                  icon: Icon(Icons.event_outlined),
                  selectedIcon: Icon(Icons.event),
                  label: 'Activity',
                ),
                NavigationDestination(
                  icon: Icon(Icons.person_outline_rounded),
                  selectedIcon: Icon(Icons.person_rounded),
                  label: 'Profile',
                ),
              ],
            ),
          ),
        );
      },
    ),
  );
}
