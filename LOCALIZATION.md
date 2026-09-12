# Localization Foundation

## Overview
Smriti Setu is designed primarily for North Eastern India. It supports multiple languages with an architecture that can be extended to local dialects.

## Supported Languages (Priority Order)
1. English (`en`)
2. Hindi (`hi`)
3. Assamese (`as`)
4. Bengali (`bn`)

## Architecture
- **Framework**: `i18next` and `react-i18next`.
- **Structure**: Translations are stored in JSON files under `src/i18n/{lang}/`.
- **Rules**:
  - Never hard-code user-visible strings into React components.
  - Use the `useTranslation` hook for all UI text.
  - Audio assets (tap-to-hear) must map to the active localization key.
  
## Future Extension
The structure supports adding new NER (North Eastern Region) languages easily by adding a new folder (e.g., `src/i18n/mni` for Manipuri) and registering it in the i18n configuration.
