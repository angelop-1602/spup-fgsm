<html>
<head>
    <meta charset="utf-8">
    <title>SPUP-Faculty Grading Sheet Management System - Faculty Loads Report</title>
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

    <h3>SPUP-Faculty Grading Sheet Management System - Faculty Loads Report</h3>
    @php
        $termLabel = '';
        if (isset($term) && $term) {
            $termLabel = $term->term_name ?? $term->period_code ?? '';
        }
        $termYear = isset($term) && $term ? ($term->academic_year ?? '') : '';
    @endphp
    @if($termLabel !== '' || $termYear !== '')
        <p>Term: {{ $termLabel }}@if($termYear !== '') ({{ $termYear }})@endif</p>
    @endif
    <p>Generated at: {{ now()->format('Y-m-d H:i:s') }}</p>
    <table class="data-table">
        <thead>
        <tr>
            <th>Term</th>
            <th>Academic Year</th>
            <th>Faculty Name</th>
            <th>Department</th>
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
            @endphp
            <tr>
                <td>{{ $load->term->period_code ?? '' }}</td>
                <td>{{ $load->term->academic_year ?? '' }}</td>
                <td>{{ $facultyName }}</td>
                <td>{{ $load->department->name ?? '' }}</td>
                <td>{{ $load->status->value ?? '' }}</td>
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
        <div class="signature-block">
            <div class="signature-group">
                <div class="signature-name">
                    {{ $registrarName ?? '' }}
                </div>
                <div class="signature-label">Confirmed by</div>
            </div>
        </div>
    </div>
</body>
</html>
