<html>
<head>
    <meta charset="utf-8">
    <title>SPUP-Faculty Grading Sheet Management System - Clearance Report</title>
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
            margin: 8px 0 4px;
        }
        .report-term {
            text-align: center;
            margin: 0 0 12px;
            font-size: 12px;
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

    <div class="report-title">{{ $reportTitle ?? 'SPUP-Faculty Grading Sheet Management System - Clearance Report' }}</div>
    <div class="report-term">{{ $term->term_name ?? '' }} ({{ $term->academic_year ?? '' }})</div>

    <table class="data-table">
        <thead>
        <tr>
            <th>Faculty Name</th>
            <th>Department</th>
            <th>Subjects</th>
            <th>Total Units</th>
            <th>Status</th>
            <th>Emp Status</th>
        </tr>
        </thead>
        <tbody>
        @foreach($loads as $load)
            @php
                $facultyName = trim(implode(' ', array_filter([
                    $load->faculty->full_name ?? '',
                    $load->faculty->middle_name ?? '',
                ], fn ($value) => trim((string) $value) !== '')));

                $subjectTotals = [];
                foreach (($load->items ?? []) as $item) {
                    $code = trim((string) ($item->subject->code ?? $item->subject_code ?? ''));
                    if ($code === '') {
                        $raw = is_array($item->raw_payload_json ?? null) ? $item->raw_payload_json : [];
                        $code = trim((string) ($raw['subject_code'] ?? $raw['subject'] ?? $raw['course_code'] ?? ''));
                    }
                    if ($code === '') {
                        $code = 'Unknown';
                    }

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

                    $subjectTotals[$code] = ($subjectTotals[$code] ?? 0.0) + (float) $units;
                }
                ksort($subjectTotals);
                $subjectsLabel = implode(', ', array_map(
                    static fn (string $code, float $units): string => $code.' ('.number_format($units, 2).')',
                    array_keys($subjectTotals),
                    array_values($subjectTotals),
                ));

                $rawStatus = (string) ($load->status->value ?? $load->status ?? '');
                $rawStatus = strtoupper(trim($rawStatus));
                $humanStatus = $rawStatus !== ''
                    ? ucwords(strtolower(str_replace('_', ' ', $rawStatus)))
                    : '';

                if (($statusMode ?? 'clearance') === 'term') {
                    $statusLabel = $rawStatus === 'PENDING'
                        ? 'Unsubmitted'
                        : $humanStatus;
                } else {
                    $statusLabel = $rawStatus === 'SUBMITTED'
                        ? 'Uncleared'
                        : $humanStatus;
                }
            @endphp
            <tr>
                <td>{{ $facultyName }}</td>
                <td>{{ $load->department->name ?? '' }}</td>
                <td>{{ $subjectsLabel }}</td>
                <td>{{ $load->total_units_sum !== null ? number_format((float) $load->total_units_sum, 2) : '' }}</td>
                <td>{{ $statusLabel }}</td>
                <td>{{ $load->faculty->emp_status ?? '' }}</td>
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
