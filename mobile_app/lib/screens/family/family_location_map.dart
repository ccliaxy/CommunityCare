import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:url_launcher/url_launcher.dart';
import 'family_demo_data.dart';

class SafeZoneDraft {
  const SafeZoneDraft(this.latitude, this.longitude, this.radius);
  final double latitude;
  final double longitude;
  final double radius;
}

/// Open only on an explicit user action: no hidden IndexedStack map downloads.
class FamilyLocationMap extends StatefulWidget {
  const FamilyLocationMap({
    super.key,
    required this.resident,
    this.editable = false,
    this.loadTiles = true,
  });
  final FamilyResident resident;
  final bool editable;
  // Test seam: tests never request public OSM tiles.
  final bool loadTiles;
  @override
  State<FamilyLocationMap> createState() => _FamilyLocationMapState();
}

class _FamilyLocationMapState extends State<FamilyLocationMap> {
  final _controller = MapController();
  late LatLng _center;
  late double _radius;
  bool _tileError = false;
  static const _green = Color(0xFF26734B);
  // flutter_map >=8.2 keeps its HTTP-header-based disk cache enabled by default.
  late final _provider = NetworkTileProvider(
    headers: kIsWeb ? {} : {'User-Agent': 'CommunityCare-FYP/1.0'},
  );
  LatLng get _position =>
      LatLng(widget.resident.sampleLatitude, widget.resident.sampleLongitude);
  @override
  void initState() {
    super.initState();
    _center = LatLng(
      widget.resident.zoneLatitude,
      widget.resident.zoneLongitude,
    );
    _radius = widget.resident.radius;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _choose(LatLng point) {
    setState(
      () => _center = LatLng(
        point.latitude.clamp(-85.0, 85.0),
        point.longitude.clamp(-180.0, 180.0),
      ),
    );
  }

  void _failedTile() {
    if (_tileError) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && !_tileError) setState(() => _tileError = true);
    });
  }

  Future<void> _attribution() async {
    try {
      if (await launchUrl(Uri.parse('https://www.openstreetmap.org/copyright')))
        return;
    } catch (_) {
      /* Show a readable alternative below. */
    }
    if (mounted)
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Map copyright: https://www.openstreetmap.org/copyright',
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    appBar: AppBar(
      title: Text(widget.editable ? 'Edit safe zone' : 'Resident map'),
    ),
    body: SafeArea(
      child: LayoutBuilder(
        builder: (context, constraints) => SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      widget.resident.name,
                      style: Theme.of(context).textTheme.titleLarge,
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'DEMO COORDINATES · Not live GPS',
                      style: TextStyle(
                        color: Color(0xFF995400),
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      widget.editable
                          ? 'Tap the map to move the zone. Or drag the map, then choose “Use map centre”. The orange person stays at the sample position.'
                          : 'Orange person: sample position. Green home and circle: saved demo safe zone.',
                    ),
                  ],
                ),
              ),
              SizedBox(
                height: (constraints.maxHeight * .5).clamp(280.0, 460.0),
                child: ClipRect(
                  child: FlutterMap(
                    mapController: _controller,
                    options: MapOptions(
                      initialCenter: _center,
                      initialZoom: 14,
                      minZoom: 3,
                      maxZoom: 19,
                      interactionOptions: const InteractionOptions(
                        flags: InteractiveFlag.all & ~InteractiveFlag.rotate,
                      ),
                      onTap: widget.editable
                          ? (_, point) => _choose(point)
                          : null,
                    ),
                    children: [
                      if (widget.loadTiles)
                        TileLayer(
                          urlTemplate:
                              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                          tileProvider: _provider,
                          maxNativeZoom: 19,
                          panBuffer: 0,
                          errorTileCallback: (_, error, stack) => _failedTile(),
                        ),
                      CircleLayer(
                        circles: [
                          CircleMarker(
                            point: _center,
                            radius: _radius,
                            useRadiusInMeter: true,
                            color: widget.resident.alertsEnabled
                                ? const Color(0x3026734B)
                                : const Color(0x30777777),
                            borderColor: widget.resident.alertsEnabled
                                ? _green
                                : Colors.grey,
                            borderStrokeWidth: 2,
                          ),
                        ],
                      ),
                      MarkerLayer(
                        markers: [
                          Marker(
                            point: _center,
                            width: 44,
                            height: 44,
                            child: const Tooltip(
                              message: 'Safe-zone centre',
                              child: Icon(Icons.home, color: _green, size: 36),
                            ),
                          ),
                          Marker(
                            point: _position,
                            width: 44,
                            height: 44,
                            child: const Tooltip(
                              message: 'Sample resident position — not live',
                              child: Icon(
                                Icons.person_pin_circle,
                                color: Color(0xFFBE5600),
                                size: 40,
                              ),
                            ),
                          ),
                        ],
                      ),
                      SimpleAttributionWidget(
                        source: const Text(
                          'OpenStreetMap contributors',
                          style: TextStyle(fontSize: 11),
                        ),
                        onTap: _attribution,
                      ),
                    ],
                  ),
                ),
              ),
              if (_tileError)
                const Padding(
                  padding: EdgeInsets.all(12),
                  child: Text(
                    'Some map tiles could not load. Check your internet connection. Markers alone do not mean the map loaded successfully.',
                    style: TextStyle(color: Colors.red),
                  ),
                ),
              Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        OutlinedButton.icon(
                          onPressed: () => _controller.move(_position, 15),
                          icon: const Icon(Icons.person_pin_circle_outlined),
                          label: const Text('Sample position'),
                        ),
                        OutlinedButton.icon(
                          onPressed: () => _controller.move(
                            _center,
                            _radius > 1000 ? 13 : 14,
                          ),
                          icon: const Icon(Icons.home_outlined),
                          label: const Text('Zone centre'),
                        ),
                        if (widget.editable)
                          OutlinedButton.icon(
                            key: const ValueKey('use-map-centre'),
                            onPressed: () => _choose(_controller.camera.center),
                            icon: const Icon(Icons.center_focus_strong),
                            label: const Text('Use map centre'),
                          ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Zone centre: ${_center.latitude.toStringAsFixed(5)}, ${_center.longitude.toStringAsFixed(5)}',
                    ),
                    Text(
                      'Radius: ${_radius.round()} m',
                      style: Theme.of(context).textTheme.titleMedium,
                    ),
                    if (widget.editable)
                      Slider(
                        key: const ValueKey('zone-radius-draft'),
                        value: _radius,
                        min: 100,
                        max: 2000,
                        divisions: 19,
                        label: '${_radius.round()} m',
                        semanticFormatterCallback: (value) =>
                            '${value.round()} metres',
                        onChanged: (value) => setState(() => _radius = value),
                      ),
                    Text(
                      widget.resident.alertsEnabled
                          ? 'Demo alert preference: on. No boundary monitoring is running.'
                          : 'Demo alert preference: off. The zone remains saved.',
                    ),
                    if (widget.editable) ...[
                      const SizedBox(height: 12),
                      FilledButton(
                        key: const ValueKey('save-demo-zone'),
                        onPressed: () => Navigator.of(context).pop(
                          SafeZoneDraft(
                            _center.latitude,
                            _center.longitude,
                            _radius,
                          ),
                        ),
                        child: const Text('Save for demo session'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Cancel — discard changes'),
                      ),
                      const Text(
                        'Saved only in memory. Logging out or restarting resets this boundary.',
                        style: TextStyle(fontSize: 13),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    ),
  );
}
