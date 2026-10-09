import '../../tasks/care_tasks_page.dart';
import 'package:flutter/material.dart';
import 'family_demo_data.dart';
import 'family_elderly_page.dart';
import 'family_home_page.dart';
import 'family_settings_page.dart';
import 'family_widgets.dart';

class FamilyShell extends StatefulWidget {
  const FamilyShell({super.key, this.onLogout, this.accountName});
  final VoidCallback? onLogout;
  final String? accountName;
  @override
  State<FamilyShell> createState() => _FamilyShellState();
}

class _FamilyShellState extends State<FamilyShell> {
  FamilyDemoData _data = FamilyDemoData();
  int _index = 0;
  void _profile(int residentIndex) {
    _data.select(residentIndex);
    setState(() => _index = 1);
  }

  void _logout() {
    if (widget.onLogout != null) {
      widget.onLogout!();
    } else if (Navigator.of(context).canPop()) {
      Navigator.of(context).pop();
    } else {
      final old = _data;
      setState(() {
        _data = FamilyDemoData();
        _index = 0;
      });
      WidgetsBinding.instance.addPostFrameCallback((_) => old.dispose());
      familyMessage(context, 'Demo session reset. Login is not connected.');
    }
  }

  @override
  void dispose() {
    _data.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Theme(
    data: familyTheme(),
    child: ListenableBuilder(
      listenable: _data,
      builder: (context, _) => Scaffold(
        appBar: AppBar(
          backgroundColor: familyCream,
          surfaceTintColor: Colors.transparent,
          titleSpacing: 20,
          actions: [if (widget.accountName != null) IconButton(
                  tooltip: 'Care tasks',
                  onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const CareTasksPage())),
                  icon: const Icon(Icons.assignment_outlined),
                ),],
          title: Row(
            children: [
              if (_index == 0) ...[
                Image.asset(
                  'assets/images/communitycare_logo.png',
                  width: 34,
                  height: 34,
                  fit: BoxFit.contain,
                  excludeFromSemantics: true,
                  errorBuilder: (_, error, stack) => const Icon(
                    Icons.volunteer_activism_outlined,
                    color: familyGreen,
                    size: 30,
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: Text(
                  ['CommunityCare', 'Elderly Profile', 'Settings'][_index],
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 23,
                    fontWeight: FontWeight.w800,
                    color: familyGreen,
                  ),
                ),
              ),
            ],
          ),
        ),
        body: SafeArea(
          top: false,
          bottom: false,
          child: Column(
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 8,
                ),
                color: const Color(0xFFEAF0E4),
                child: Text(
                  widget.accountName == null
                      ? 'Family UI preview · Sample data'
                      : 'Signed in: ${widget.accountName} · Family pages still use sample data',
                  style: TextStyle(fontSize: 13, color: familyGreen),
                ),
              ),
              if (_index != 0)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
                  child: DropdownButtonFormField<int>(
                    key: ValueKey('resident-picker-${_data.selectedIndex}'),
                    initialValue: _data.selectedIndex,
                    isExpanded: true,
                    decoration: const InputDecoration(
                      labelText: 'Selected elderly',
                    ),
                    items: [
                      for (int i = 0; i < _data.residents.length; i++)
                        DropdownMenuItem(
                          value: i,
                          child: Text(
                            _data.residents[i].name,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                    ],
                    onChanged: (value) {
                      if (value != null) _data.select(value);
                    },
                  ),
                ),
              Expanded(
                child: IndexedStack(
                  index: _index,
                  children: [
                    FamilyHomePage(data: _data, onProfile: _profile),
                    FamilyElderlyPage(
                      key: ValueKey('elderly-${_data.selected.id}'),
                      data: _data,
                    ),
                    FamilySettingsPage(
                      key: ValueKey('settings-${_data.selected.id}'),
                      data: _data,
                      onLogout: _logout,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: NavigationBar(
          selectedIndex: _index,
          backgroundColor: const Color(0xFFF1F5E9),
          indicatorColor: const Color(0xFFD4E8C9),
          onDestinationSelected: (value) => setState(() => _index = value),
          destinations: const [
            NavigationDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: 'Home',
            ),
            NavigationDestination(
              icon: Icon(Icons.people_outline),
              selectedIcon: Icon(Icons.people),
              label: 'Elderly',
            ),
            NavigationDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings),
              label: 'Settings',
            ),
          ],
        ),
      ),
    ),
  );
}
