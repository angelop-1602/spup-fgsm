<html>
<head>
    <meta charset="utf-8">
    <title>{{ $reportTitle ?? 'SPUP-Faculty Grading Sheet Management System - Faculty Unsubmitted Report' }}</title>
    <link href="https://fonts.googleapis.com/css2?family=UnifrakturCook:wght@700&display=swap" rel="stylesheet">

    <style>
        body {
            font-family: DejaVu Sans, sans-serif;
            font-size: 12px;
        }
        .header {
            width: 100%;
            margin-bottom: 16px;
            text-align: center;
        }
        .header-table {
            margin: 0 auto;
            border-collapse: collapse;
        }
        .header-logo-cell {
            padding-right: 8px;
            vertical-align: middle;
        }
        .header-text-cell {
            padding-left: 8px;
            text-align: center;
            vertical-align: middle;
        }
        .spup-name {
            font-family: 'UnifrakturCook', "Old English Text MT", serif;
            font-size: 22px;
            font-weight: bold;
        }
        .spup-address {
            font-family: "Times New Roman", serif;
            font-size: 14px;
            text-align: center;
        }
        .report-title {
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            margin: 8px 0 8px;
        }
        .meta {
            margin: 0 0 12px;
            padding: 4px 2px;
        }
        .meta-grid {
            width: 100%;
            display: table;
        }
        .meta-col {
            display: table-cell;
            width: 50%;
            vertical-align: top;
            padding-right: 8px;
        }
        .meta-row {
            margin: 0 0 3px;
        }
        table.data-table {
            width: 100%;
            border-collapse: collapse;
        }
        table.data-table th,
        table.data-table td {
            border: 1px solid #ccc;
            padding: 4px 6px;
            text-align: left;
        }
        table.data-table th {
            background-color: #f3f3f3;
        }
        .signatures {
            margin-top: 28px;
            width: 100%;
        }
        .signature-block {
            margin-bottom: 18px;
            text-align: left;
        }
        .signature-group {
            display: inline-block;
            text-align: center;
        }
        .signature-name {
            display: inline-block;
            min-width: 200px;
            padding-bottom: 4px;
            border-bottom: 1px solid #333;
            font-weight: 600;
            font-size: 14px;
        }
        .signature-label {
            margin-top: 6px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <table class="header-table">
            <tr>
                <td class="header-logo-cell">
                    <img src="{{ public_path('SPUP-Logo-with-yellow.png') }}" alt="SPUP Logo" height="50">
                </td>
                <td class="header-text-cell">
                    <div class="spup-name">St. Paul University Philippines</div>
                    <div class="spup-address">Tuguegaro City, Cagayan 3500</div>
                </td>
            </tr>
        </table>
    </div>

    <div class="report-title">{{ $reportTitle ?? 'SPUP-Faculty Grading Sheet Management System - Faculty Unsubmitted Report' }}</div>

    @php
        $facultyName = trim(implode(' ', array_filter([
            $faculty->full_name ?? '',
            $faculty->middle_name ?? '',
        ], fn ($value) => trim((string) $value) !== '')));
    @endphp

    <div class="meta">
        <div class="meta-grid">
            <div class="meta-col">
                <p class="meta-row"><strong>Faculty:</strong> {{ $facultyName }} @if(($faculty->faculty_code ?? '') !== '') ({{ $faculty->faculty_code }}) @endif</p>
                <p class="meta-row"><strong>Department:</strong> {{ $faculty->department->name ?? 'No department' }}</p>
            </div>
            <div class="meta-col">
                <p class="meta-row"><strong>Emp Status:</strong> {{ $faculty->emp_status ?? '' }}</p>
                <p class="meta-row"><strong>Generated at:</strong> {{ now()->format('Y-m-d H:i:s') }}</p>
            </div>
        </div>
    </div>

    <table class="data-table">
        <thead>
        <tr>
            <th>Term</th>
            <th>Academic Year</th>
            <th>Subject</th>
            <th>Section</th>
            <th>Units</th>
            <th>Status</th>
        </tr>
        </thead>
        <tbody>
        @foreach($items as $item)
            @php
                $term = $item->facultyLoad->term ?? null;
                $rawStatus = (string) ($item->status->value ?? $item->status ?? '');
                $rawStatus = strtoupper(trim($rawStatus));
                $statusLabel = $rawStatus === 'PENDING'
                    ? 'Unsubmitted'
                    : ($rawStatus !== '' ? ucwords(strtolower(str_replace('_', ' ', $rawStatus))) : '');

                $code = trim((string) ($item->subject->code ?? $item->subject_code ?? ''));
                if ($code === '') {
                    $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                    $code = trim((string) ($raw['subject_code'] ?? $raw['subject'] ?? $raw['course_code'] ?? ''));
                }
                if ($code === '') {
                    $code = 'Unknown';
                }

                $section = (string) ($item->section ?? '');

                $units = $item->total_units;
                if ($units === null) {
                    $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                    $rawUnits = $raw['load_units'] ?? $raw['units'] ?? null;
                    if ($rawUnits !== null && is_numeric(str_replace(',', '', (string) $rawUnits))) {
                        $units = (float) str_replace(',', '', (string) $rawUnits);
                    } else {
                        $lec = is_numeric($item->units_lec ?? null) ? (float) $item->units_lec : 0.0;
                        $lab = is_numeric($item->units_lab ?? null) ? (float) $item->units_lab : 0.0;
                        $units = $lec + $lab;
                    }
                }
            @endphp
            <tr>
                <td>{{ $term?->period_code ?? '' }}</td>
                <td>{{ $term?->academic_year ?? '' }}</td>
                <td>{{ $code }}</td>
                <td>{{ $section }}</td>
                <td>{{ number_format((float) ($units ?? 0.0), 2) }}</td>
                <td>{{ $statusLabel }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="signatures">
        <div class="signature-block">
            <div class="signature-group">
                <div class="signature-name">
                    {{ $preparedBy ?? '' }}
                </div>
                <div class="signature-label">Prepared by</div>
            </div>
        </div>
        @if(($showConfirmedBy ?? true) && ($registrarName ?? '') !== '')
            <div class="signature-block">
                <div class="signature-group">
                    <div class="signature-name">
                        {{ $registrarName ?? '' }}
                    </div>
                    <div class="signature-label">Confirmed by</div>
                </div>
            </div>
        @endif
    </div>
</body>
</html>

