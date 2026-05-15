param([string]$Lang = "both")

function InjectSecretairesClinique {
  param([string]$JsonPath, [string]$OldDeclined, [string]$SecretairesBlock)

  $content = [System.IO.File]::ReadAllText($JsonPath, [System.Text.Encoding]::UTF8)
  $declIdx = $content.LastIndexOf('"declined"')
  if ($declIdx -eq -1) { Write-Host "SKIP $JsonPath: no declined key"; return }

  # Find closing pattern after declined: \r\n    }\r\n  },\r\n  "admin": {
  $closePattern = "`r`n    }`r`n  },`r`n  `"admin`": {"
  $closeIdx = $content.IndexOf($closePattern, $declIdx)
  if ($closeIdx -eq -1) {
    # try LF only
    $closePattern = "`n    }`n  },`n  `"admin`": {"
    $closeIdx = $content.IndexOf($closePattern, $declIdx)
  }
  if ($closeIdx -eq -1) { Write-Host "ERROR $JsonPath: closing pattern not found"; return }

  # Replace: insert secretaires block before closing
  $newClose = $SecretairesBlock + $closePattern
  $updated = $content.Substring(0, $closeIdx) + $newClose + $content.Substring($closeIdx + $closePattern.Length)

  [System.IO.File]::WriteAllText($JsonPath, $updated, [System.Text.Encoding]::UTF8)
  Write-Host "Updated $JsonPath"
}

$basePath = "C:\Users\user2024\Desktop\doktori\apps\web\i18n\messages"

# FR block
$frBlock = @"

    },
    "secretaires": {
      "title": "Secrétaires",
      "subtitle": "Gérer les secrétaires de la clinique",
      "addButton": "Ajouter une secrétaire",
      "newTitle": "Nouvelle secrétaire",
      "cabinet": "Cabinet",
      "selectCabinet": "Sélectionner un cabinet",
      "cabinetHint": "La secrétaire sera scopée à ce cabinet uniquement.",
      "noCabinets": "Ce médecin n'a aucun cabinet lié à cette clinique."
    }
"@

# AR block
$arBlock = @"

    },
    "secretaires": {
      "title": "السكرتيرات",
      "subtitle": "إدارة سكرتيرات العيادة",
      "addButton": "إضافة سكرتيرة",
      "newTitle": "سكرتيرة جديدة",
      "cabinet": "المكتب",
      "selectCabinet": "اختر مكتباً",
      "cabinetHint": "ستكون السكرتيرة مقيدة بهذا المكتب فقط.",
      "noCabinets": "لا يوجد مكتب مرتبط بهذا الطبيب في العيادة."
    }
"@

if ($Lang -eq "both" -or $Lang -eq "fr") {
  InjectSecretairesClinique -JsonPath "$basePath\fr.json" -SecretairesBlock $frBlock
}
if ($Lang -eq "both" -or $Lang -eq "ar") {
  InjectSecretairesClinique -JsonPath "$basePath\ar.json" -SecretairesBlock $arBlock
}

# Now inject medecin.secretaires cabinet/selectCabinet/moveCabinet keys
# Find medecin.secretaires in both files and add the new keys at end of that block

function InjectMedecinSecretairesCabinet {
  param([string]$JsonPath, [string]$ExistingKey, [string]$NewKeys)

  $content = [System.IO.File]::ReadAllText($JsonPath, [System.Text.Encoding]::UTF8)
  # Already has cabinet key?
  if ($content.Contains('"cabinet": ') -and $content.IndexOf('"cabinet": ') -lt $content.IndexOf('"admin":')) {
    Write-Host "SKIP $JsonPath: cabinet key already present in medecin.secretaires"
    return
  }
  # Find the last 'daySat' key which is the last key in medecin.secretaires
  $markerIdx = $content.LastIndexOf('"daySat"')
  if ($markerIdx -eq -1) { Write-Host "ERROR $JsonPath: daySat not found"; return }
  # Find the end of that line
  $lineEnd = $content.IndexOf("`n", $markerIdx)
  if ($lineEnd -eq -1) { Write-Host "ERROR $JsonPath: no newline after daySat"; return }

  $updated = $content.Substring(0, $lineEnd + 1) + $NewKeys + $content.Substring($lineEnd + 1)
  [System.IO.File]::WriteAllText($JsonPath, $updated, [System.Text.Encoding]::UTF8)
  Write-Host "Updated medecin.secretaires in $JsonPath"
}

$frMedKeys = "      `"cabinet`": `"Cabinet`",`r`n      `"selectCabinet`": `"Sélectionner un cabinet`",`r`n      `"moveCabinet`": `"Déplacer vers ce cabinet`"`r`n"
$arMedKeys = "      `"cabinet`": `"المكتب`",`r`n      `"selectCabinet`": `"اختر مكتباً`",`r`n      `"moveCabinet`": `"نقل إلى هذا المكتب`"`r`n"

if ($Lang -eq "both" -or $Lang -eq "fr") {
  InjectMedecinSecretairesCabinet -JsonPath "$basePath\fr.json" -NewKeys $frMedKeys
}
if ($Lang -eq "both" -or $Lang -eq "ar") {
  InjectMedecinSecretairesCabinet -JsonPath "$basePath\ar.json" -NewKeys $arMedKeys
}

Write-Host "Done."
