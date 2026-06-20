import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:simpaskor_mobile/app.dart';
import 'package:simpaskor_mobile/core/api/api_client.dart';

void main() {
  setUpAll(() {
    apiClient.init();
  });

  testWidgets('App starts and shows loading or login screen', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(child: SimpaskorApp()),
    );
    await tester.pump();
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
