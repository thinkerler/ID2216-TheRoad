import React, { useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../shared/theme/colors';

const MIN_DATE_YEAR = 1900;
const MAX_DATE_YEAR = 2100;

const TAG_PRESETS = {
  bgmMoodTags: ['chill', 'cinematic', 'nostalgic', 'bright', 'calm', 'romantic'],
  bgmActivityTags: ['citywalk', 'roadtrip', 'food', 'museum', 'beach', 'hiking'],
  bgmPreferredGenres: ['lofi', 'indie pop', 'jazz', 'house', 'folk', 'ambient'],
  bgmCustomKeywords: ['sunset', 'neon', 'mountain', 'rain', 'market', 'train'],
};

const INFO_TEXT = {
  dates: 'Dates are saved as real calendar days. The end date must be the same day or later.',
  destination: 'Type any city and country. Then load popular places for that destination.',
  totalSpend: 'Total Spend is calculated from Daily Expenses and is not typed by hand.',
  placeCount: 'Place Count follows the selected visited places so it stays consistent.',
  travelStyle: 'Travel Style helps the BGM matcher understand what kind of trip this was.',
  energyLevel: 'Energy Level runs from 1 calm to 5 intense for music matching.',
};

function pad2(value) {
  return String(value).padStart(2, '0');
}

function dateToText(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function parseDateText(value) {
  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  const minDate = new Date(MIN_DATE_YEAR, 0, 1);
  const maxDate = new Date(MAX_DATE_YEAR, 11, 31);
  if (date.getTime() < minDate.getTime() || date.getTime() > maxDate.getTime()) {
    return null;
  }

  return date;
}

function parseTextList(value) {
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function listToText(list) {
  return list.join(', ');
}

function parseExpenseList(value) {
  return parseTextList(value)
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item >= 0);
}

function sumNumbers(list) {
  return list.reduce((sum, item) => sum + Number(item || 0), 0);
}

function cleanMoneyText(value) {
  const clean = String(value || '').replace(/[^0-9.]/g, '');
  const parts = clean.split('.');
  if (parts.length <= 1) return clean;
  return `${parts[0]}.${parts.slice(1).join('')}`;
}

function InfoLabel({ label, info }) {
  const [isOpen, setOpen] = useState(false);

  return (
    <View style={styles.labelBlock}>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        {info ? (
          <Pressable style={styles.infoBtn} onPress={() => setOpen((prev) => !prev)}>
            <Ionicons name="information-circle-outline" size={14} color={Colors.primary} />
          </Pressable>
        ) : null}
      </View>
      {isOpen ? <Text style={styles.infoText}>{info}</Text> : null}
    </View>
  );
}

function Field({
  label,
  value,
  placeholder,
  onChangeText,
  keyboardType = 'default',
  info,
  editable = true,
  containerStyle,
}) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <InfoLabel label={label} info={info} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textTertiary}
        keyboardType={keyboardType}
        editable={editable}
        style={[styles.input, !editable && styles.readOnlyInput]}
      />
    </View>
  );
}

function DateButton({ label, value, active, onPress }) {
  return (
    <Pressable
      style={[styles.dateButton, active && styles.dateButtonActive]}
      onPress={onPress}
    >
      <Text style={styles.dateButtonLabel}>{label}</Text>
      <Text style={[styles.dateButtonText, !value && styles.placeholderText]}>
        {value || 'Pick date'}
      </Text>
    </Pressable>
  );
}

function CalendarRangePicker({
  startDate,
  endDate,
  activeField,
  onOpenField,
  onSelectDate,
}) {
  const [isPickerVisible, setPickerVisible] = useState(false);
  const start = parseDateText(startDate);
  const end = parseDateText(endDate);
  const pickerDate = activeField === 'startDate'
    ? start || new Date()
    : end || start || new Date();
  const minDate = new Date(MIN_DATE_YEAR, 0, 1);
  const maxDate = new Date(MAX_DATE_YEAR, 11, 31);
  const isWeb = Platform.OS === 'web';

  return (
    <View style={styles.fieldWrap}>
      <InfoLabel label="Travel Dates" info={INFO_TEXT.dates} />
      <View style={styles.dateRow}>
        <DateButton
          label="Start"
          value={startDate}
          active={activeField === 'startDate'}
          onPress={() => {
            onOpenField('startDate');
            setPickerVisible(true);
          }}
        />
        <DateButton
          label="End"
          value={endDate}
          active={activeField === 'endDate'}
          onPress={() => {
            onOpenField('endDate');
            setPickerVisible(true);
          }}
        />
      </View>

      {isPickerVisible ? (
        <View style={styles.datePickerBox}>
          {isWeb ? (
            <input
              type="date"
              value={activeField === 'startDate' ? startDate : endDate}
              min="1900-01-01"
              max="2100-12-31"
              onChange={(event) => {
                onSelectDate(event.target.value);
                setPickerVisible(false);
              }}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                backgroundColor: Colors.background,
                color: Colors.textPrimary,
                border: 'none',
                outline: 'none',
                padding: 12,
                fontSize: 15,
              }}
            />
          ) : (
            <DateTimePicker
              value={pickerDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
              minimumDate={minDate}
              maximumDate={maxDate}
              themeVariant="dark"
              onChange={(_, selectedDate) => {
                if (selectedDate) {
                  onSelectDate(dateToText(selectedDate));
                }
                if (Platform.OS !== 'ios') {
                  setPickerVisible(false);
                }
              }}
            />
          )}
        </View>
      ) : null}
    </View>
  );
}

function DestinationInputSection({
  destination,
  country,
  onChangeDestinationText,
  onChangeCountryText,
  onLoadSuggestions,
  onClearSuggestions,
}) {
  const canLoad = String(destination || '').trim().length > 1;

  return (
    <View style={styles.fieldWrap}>
      <InfoLabel label="Destination" info={INFO_TEXT.destination} />
      <View style={styles.twoColumnRow}>
        <Field
          label="City"
          value={destination}
          placeholder="Copenhagen"
          onChangeText={(text) => {
            onChangeDestinationText(text);
            onClearSuggestions?.();
          }}
          containerStyle={styles.columnField}
        />
        <Field
          label="Country"
          value={country}
          placeholder="Denmark"
          onChangeText={(text) => {
            onChangeCountryText(text);
            onClearSuggestions?.();
          }}
          containerStyle={styles.columnField}
        />
      </View>
      <Pressable
        style={[styles.suggestionLoadBtn, !canLoad && styles.suggestionLoadBtnDisabled]}
        onPress={onLoadSuggestions}
        disabled={!canLoad}
      >
        <Ionicons name="sparkles-outline" size={16} color={Colors.primary} />
        <Text style={styles.suggestionLoadText}>Suggest popular places</Text>
      </Pressable>
    </View>
  );
}

function Pill({ label, selected, onPress, onRemove }) {
  return (
    <Pressable
      style={[styles.pill, selected && styles.pillSelected]}
      onPress={onPress}
    >
      <Text style={[styles.pillText, selected && styles.pillTextSelected]} numberOfLines={1}>
        {label}
      </Text>
      {onRemove ? (
        <Pressable style={styles.pillRemove} onPress={onRemove}>
          <Ionicons name="close" size={12} color={Colors.textPrimary} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function VisitedPlacesEditor({
  value,
  suggestions,
  suggestionsStatus,
  suggestionsErrorMessage,
  onChangePlacesText,
  onChangePlaceCount,
}) {
  const [draft, setDraft] = useState('');
  const selectedPlaces = parseTextList(value);
  const shownSuggestions = Array.isArray(suggestions) ? suggestions.slice(0, 10) : [];
  const hasPlace = (place) =>
    selectedPlaces.some(
      (item) => item.toLowerCase() === String(place || '').toLowerCase(),
    );

  const savePlaces = (nextPlaces) => {
    onChangePlacesText(listToText(nextPlaces));
    onChangePlaceCount(String(nextPlaces.length));
  };

  const addPlace = (place) => {
    const clean = String(place || '').trim();
    if (!clean) return;
    if (hasPlace(clean)) {
      setDraft('');
      return;
    }
    savePlaces([...selectedPlaces, clean]);
    setDraft('');
  };

  const removePlace = (place) => {
    savePlaces(
      selectedPlaces.filter(
        (item) => item.toLowerCase() !== String(place || '').toLowerCase(),
      ),
    );
  };

  return (
    <View style={styles.fieldWrap}>
      <View style={styles.sectionTitleRow}>
        <InfoLabel label="Visited Places" info={INFO_TEXT.placeCount} />
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{selectedPlaces.length}</Text>
        </View>
      </View>

      {suggestionsStatus === 'loading' ? (
        <View style={styles.suggestionLoadingRow}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.miniLabel}>Loading popular places...</Text>
        </View>
      ) : null}

      {suggestionsStatus === 'error' ? (
        <Text style={styles.errorText}>
          {suggestionsErrorMessage || 'Could not load suggestions.'}
        </Text>
      ) : null}

      {shownSuggestions.length ? (
        <View style={styles.suggestionBlock}>
          <Text style={styles.miniLabel}>Suggested popular places</Text>
          <View style={styles.chipWrap}>
            {shownSuggestions.map((place) => {
              const selected = hasPlace(place);
              return (
                <Pill
                  key={place}
                  label={place}
                  selected={selected}
                  onPress={() => (selected ? removePlace(place) : addPlace(place))}
                />
              );
            })}
          </View>
        </View>
      ) : null}

      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Add one place"
          placeholderTextColor={Colors.textTertiary}
          style={styles.addInput}
        />
        <Pressable style={styles.addSmallBtn} onPress={() => addPlace(draft)}>
          <Ionicons name="add" size={20} color={Colors.textInverse} />
        </Pressable>
      </View>

      {selectedPlaces.length ? (
        <View style={styles.chipWrap}>
          {selectedPlaces.map((place) => (
            <Pill
              key={place}
              label={place}
              selected
              onRemove={() => removePlace(place)}
            />
          ))}
        </View>
      ) : (
        <Text style={styles.emptyHint}>No places added yet.</Text>
      )}
    </View>
  );
}

function DailyExpensesEditor({ value, onChangeExpenses, onChangeSpent }) {
  const [rows, setRows] = useState(() => {
    const savedValues = parseExpenseList(value).map((item) => String(item));
    return savedValues.length ? savedValues : [''];
  });
  const total = sumNumbers(
    rows.map((item) => Number(item)).filter((item) => Number.isFinite(item)),
  );

  const saveRows = (nextRows) => {
    const cleanRows = nextRows.map((item) => cleanMoneyText(item));
    const finalRows = cleanRows.filter((item) => item !== '');
    const nextTotal = sumNumbers(finalRows.map((item) => Number(item)));
    setRows(cleanRows.length ? cleanRows : ['']);
    onChangeExpenses(listToText(finalRows));
    onChangeSpent(String(nextTotal));
  };

  const changeRow = (index, text) => {
    const nextRows = [...rows];
    nextRows[index] = cleanMoneyText(text);
    saveRows(nextRows);
  };

  const addRow = () => {
    saveRows([...rows, '']);
  };

  const removeRow = (index) => {
    if (rows.length <= 1) {
      saveRows(['']);
      return;
    }
    saveRows(rows.filter((_, itemIndex) => itemIndex !== index));
  };

  return (
    <View style={styles.fieldWrap}>
      <InfoLabel label="Total Spend" info={INFO_TEXT.totalSpend} />
      <View style={styles.totalBox}>
        <Text style={styles.totalLabel}>Calculated total</Text>
        <Text style={styles.totalValue}>${Math.round(total).toLocaleString()}</Text>
      </View>

      <Text style={styles.miniLabel}>Daily Expenses</Text>
      {rows.map((item, index) => (
        <View key={`expense-${index}`} style={styles.expenseRow}>
          <Text style={styles.dayLabel}>Day {index + 1}</Text>
          <TextInput
            value={item}
            onChangeText={(text) => changeRow(index, text)}
            placeholder="0"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numeric"
            style={styles.expenseInput}
          />
          <Pressable
            style={styles.removeSmallBtn}
            onPress={() => removeRow(index)}
          >
            <Ionicons name="remove" size={18} color={Colors.textPrimary} />
          </Pressable>
        </View>
      ))}

      <Pressable style={styles.addDayBtn} onPress={addRow}>
        <Ionicons name="add" size={18} color={Colors.primary} />
        <Text style={styles.addDayText}>Add day</Text>
      </Pressable>
    </View>
  );
}

function TagPicker({ label, value, presets, info, onChangeText }) {
  const [draft, setDraft] = useState('');
  const selectedTags = parseTextList(value);
  const hasTag = (tag) =>
    selectedTags.some((item) => item.toLowerCase() === String(tag || '').toLowerCase());

  const saveTags = (nextTags) => {
    onChangeText(listToText(nextTags));
  };

  const addTag = (tag) => {
    const clean = String(tag || '').trim().toLowerCase();
    if (!clean) return;
    if (hasTag(clean)) {
      setDraft('');
      return;
    }
    saveTags([...selectedTags, clean]);
    setDraft('');
  };

  const removeTag = (tag) => {
    saveTags(
      selectedTags.filter(
        (item) => item.toLowerCase() !== String(tag || '').toLowerCase(),
      ),
    );
  };

  return (
    <View style={styles.fieldWrap}>
      <InfoLabel label={label} info={info} />
      <View style={styles.chipWrap}>
        {presets.map((tag) => {
          const selected = hasTag(tag);
          return (
            <Pill
              key={tag}
              label={tag}
              selected={selected}
              onPress={() => (selected ? removeTag(tag) : addTag(tag))}
            />
          );
        })}
      </View>
      <View style={styles.addRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          placeholder="Other"
          placeholderTextColor={Colors.textTertiary}
          style={styles.addInput}
        />
        <Pressable style={styles.addSmallBtn} onPress={() => addTag(draft)}>
          <Ionicons name="add" size={20} color={Colors.textInverse} />
        </Pressable>
      </View>
    </View>
  );
}

function EnergyPicker({ value, onChangeText }) {
  const selected = Number(value);

  return (
    <View style={styles.fieldWrap}>
      <InfoLabel label="Energy Level" info={INFO_TEXT.energyLevel} />
      <View style={styles.energyRow}>
        {[1, 2, 3, 4, 5].map((level) => (
          <Pressable
            key={`energy-${level}`}
            style={[
              styles.energyBtn,
              selected === level && styles.energyBtnActive,
            ]}
            onPress={() => onChangeText(String(level))}
          >
            <Text
              style={[
                styles.energyText,
                selected === level && styles.energyTextActive,
              ]}
            >
              {level}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function AddJourneyModal({
  visible,
  form,
  mode = 'create',
  submitStatus,
  submitErrorMessage,
  placeSuggestions = [],
  placeSuggestionsStatus = 'idle',
  placeSuggestionsErrorMessage,
  onChangeField,
  onLoadPlaceSuggestions,
  onClearPlaceSuggestions,
  onPickPhotos,
  onRemoveExistingPhoto,
  onRemoveLocalPhoto,
  onClose,
  onSubmit,
}) {
  const actionStatus = submitStatus || 'idle';
  const actionErrorMessage = submitErrorMessage;
  const isSaving = actionStatus === 'loading';
  const selectedLocalPhotoUris = Array.isArray(form.localPhotoUris)
    ? form.localPhotoUris
    : [];
  const selectedExistingPhotoUrls = Array.isArray(form.existingPhotoUrls)
    ? form.existingPhotoUrls
    : [];
  const selectedPhotoCount = selectedExistingPhotoUrls.length + selectedLocalPhotoUris.length;
  const isEditMode = mode === 'edit';
  const titleText = isEditMode ? 'Edit Journey' : 'Add New Journey';
  const pickPhotosText = isEditMode ? 'Add Photos from Album' : 'Select Photos from Album';
  const submitText = isEditMode ? 'Save Changes' : 'Upload Journey';
  const [activeDateField, setActiveDateField] = useState('startDate');

  const currentPlaceCount = useMemo(
    () => parseTextList(form.visitedLocations).length,
    [form.visitedLocations],
  );

  const loadPlaceSuggestions = () => {
    onLoadPlaceSuggestions?.(form.destination, form.country);
  };

  const selectDate = (dateText) => {
    const pickedDate = parseDateText(dateText);
    if (!pickedDate) return;

    if (activeDateField === 'startDate') {
      const endDate = parseDateText(form.endDate);
      onChangeField('startDate', dateText);
      if (endDate && endDate.getTime() < pickedDate.getTime()) {
        onChangeField('endDate', '');
      }
      setActiveDateField('endDate');
      return;
    }

    const startDate = parseDateText(form.startDate);
    if (startDate && pickedDate.getTime() < startDate.getTime()) {
      onChangeField('startDate', dateText);
      onChangeField('endDate', '');
      setActiveDateField('endDate');
      return;
    }

    onChangeField('endDate', dateText);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{titleText}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} disabled={isSaving}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
            <Text style={styles.helperText}>Required: destination, country, dates, and at least one photo.</Text>

            <DestinationInputSection
              destination={form.destination}
              country={form.country}
              onChangeDestinationText={(v) => onChangeField('destination', v)}
              onChangeCountryText={(v) => onChangeField('country', v)}
              onLoadSuggestions={loadPlaceSuggestions}
              onClearSuggestions={onClearPlaceSuggestions}
            />

            <CalendarRangePicker
              startDate={form.startDate}
              endDate={form.endDate}
              activeField={activeDateField}
              onOpenField={setActiveDateField}
              onSelectDate={selectDate}
            />

            <View style={styles.fieldWrap}>
              <Text style={styles.fieldLabel}>Trip Photos</Text>
              <Pressable
                style={styles.photoPickerBtn}
                onPress={onPickPhotos}
                disabled={isSaving}
              >
                <Ionicons name="images-outline" size={17} color={Colors.primary} />
                <Text style={styles.photoPickerBtnText}>{pickPhotosText}</Text>
              </Pressable>
              <Text style={styles.photoCountText}>
                {selectedPhotoCount} photo(s) selected
              </Text>

              {selectedPhotoCount > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.previewRow}
                >
                  {selectedExistingPhotoUrls.map((uri, index) => (
                    <View key={`existing-preview-${index}`} style={styles.previewItem}>
                      <Image
                        source={{ uri }}
                        style={styles.previewImage}
                      />
                      <Pressable
                        style={styles.removePhotoBtn}
                        onPress={() => onRemoveExistingPhoto?.(index)}
                        disabled={isSaving}
                      >
                        <Ionicons name="close" size={11} color={Colors.textInverse} />
                      </Pressable>
                    </View>
                  ))}

                  {selectedLocalPhotoUris.map((uri, index) => (
                    <View key={`local-preview-${index}`} style={styles.previewItem}>
                      <Image
                        source={{ uri }}
                        style={styles.previewImage}
                      />
                      <Pressable
                        style={styles.removePhotoBtn}
                        onPress={() => onRemoveLocalPhoto?.(index)}
                        disabled={isSaving}
                      >
                        <Ionicons name="close" size={11} color={Colors.textInverse} />
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              ) : null}
            </View>

            <VisitedPlacesEditor
              value={form.visitedLocations}
              suggestions={placeSuggestions}
              suggestionsStatus={placeSuggestionsStatus}
              suggestionsErrorMessage={placeSuggestionsErrorMessage}
              onChangePlacesText={(v) => onChangeField('visitedLocations', v)}
              onChangePlaceCount={(v) => onChangeField('places', v)}
            />

            <Field
              label="Place Count"
              value={String(currentPlaceCount || form.places || '0')}
              placeholder="0"
              keyboardType="numeric"
              editable={false}
              info={INFO_TEXT.placeCount}
              onChangeText={(v) => onChangeField('places', v)}
            />

            <DailyExpensesEditor
              value={form.dailyExpenses}
              onChangeExpenses={(v) => onChangeField('dailyExpenses', v)}
              onChangeSpent={(v) => onChangeField('spent', v)}
            />

            <Text style={styles.sectionLabel}>BGM Matching Preferences (optional)</Text>
            <TagPicker
              label="Mood Tags"
              value={form.bgmMoodTags}
              presets={TAG_PRESETS.bgmMoodTags}
              onChangeText={(v) => onChangeField('bgmMoodTags', v)}
            />
            <TagPicker
              label="Travel Style"
              value={form.bgmActivityTags}
              presets={TAG_PRESETS.bgmActivityTags}
              info={INFO_TEXT.travelStyle}
              onChangeText={(v) => onChangeField('bgmActivityTags', v)}
            />
            <TagPicker
              label="Preferred Genres"
              value={form.bgmPreferredGenres}
              presets={TAG_PRESETS.bgmPreferredGenres}
              onChangeText={(v) => onChangeField('bgmPreferredGenres', v)}
            />
            <TagPicker
              label="Custom Keywords"
              value={form.bgmCustomKeywords}
              presets={TAG_PRESETS.bgmCustomKeywords}
              onChangeText={(v) => onChangeField('bgmCustomKeywords', v)}
            />
            <EnergyPicker
              value={form.bgmEnergyLevel}
              onChangeText={(v) => onChangeField('bgmEnergyLevel', v)}
            />

            {actionErrorMessage ? (
              <Text style={styles.errorText}>{actionErrorMessage}</Text>
            ) : null}

            <View style={styles.footerRow}>
              <Pressable style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={styles.submitBtn} onPress={onSubmit} disabled={isSaving}>
                {isSaving ? (
                  <ActivityIndicator size="small" color={Colors.textInverse} />
                ) : (
                  <Text style={styles.submitBtnText}>{submitText}</Text>
                )}
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingTop: 10,
    paddingBottom: 24,
  },
  helperText: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 10,
  },
  sectionLabel: {
    marginTop: 4,
    marginBottom: 8,
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  fieldWrap: {
    marginBottom: 12,
  },
  twoColumnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  columnField: {
    flex: 1,
  },
  labelBlock: {
    marginBottom: 4,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  infoBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoText: {
    marginTop: 4,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 14,
  },
  readOnlyInput: {
    color: Colors.primary,
    backgroundColor: Colors.surfaceLight,
  },
  placeholderText: {
    color: Colors.textTertiary,
  },
  suggestionLoadBtn: {
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    marginTop: -2,
  },
  suggestionLoadBtnDisabled: {
    opacity: 0.45,
  },
  suggestionLoadText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  dateButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  dateButtonLabel: {
    color: Colors.textSecondary,
    fontSize: 11,
    marginBottom: 2,
  },
  dateButtonText: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  datePickerBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 12,
    backgroundColor: Colors.background,
    overflow: 'hidden',
    paddingVertical: 4,
  },
  photoPickerBtn: {
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.primarySoft,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  photoPickerBtnText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  photoCountText: {
    marginTop: 6,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  previewRow: {
    marginTop: 8,
    gap: 8,
    paddingRight: 10,
  },
  previewItem: {
    width: 64,
    height: 64,
  },
  previewImage: {
    width: 64,
    height: 64,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.surfaceLight,
  },
  removePhotoBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countBadge: {
    minWidth: 28,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
    borderWidth: 1,
    borderColor: Colors.borderMedium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countBadgeText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  suggestionBlock: {
    marginTop: 4,
  },
  suggestionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  miniLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
    marginBottom: 7,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  pill: {
    minHeight: 32,
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.surfaceLight,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pillSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primarySoft,
  },
  pillText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  pillTextSelected: {
    color: Colors.primary,
  },
  pillRemove: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  addInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  addSmallBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyHint: {
    color: Colors.textTertiary,
    fontSize: 12,
  },
  totalBox: {
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    backgroundColor: Colors.background,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  totalLabel: {
    color: Colors.textSecondary,
    fontSize: 12,
  },
  totalValue: {
    marginTop: 3,
    color: Colors.primary,
    fontSize: 22,
    fontWeight: '700',
  },
  expenseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  dayLabel: {
    width: 52,
    color: Colors.textSecondary,
    fontSize: 12,
  },
  expenseInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    backgroundColor: Colors.background,
    color: Colors.textPrimary,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  removeSmallBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
  },
  addDayBtn: {
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    backgroundColor: Colors.surfaceLight,
  },
  addDayText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  energyRow: {
    flexDirection: 'row',
    gap: 8,
  },
  energyBtn: {
    flex: 1,
    height: 38,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceLight,
  },
  energyBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  energyText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  energyTextActive: {
    color: Colors.textInverse,
  },
  errorText: {
    marginTop: 4,
    color: Colors.danger,
    fontSize: 13,
  },
  footerRow: {
    marginTop: 14,
    flexDirection: 'row',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.borderDefault,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.surfaceLight,
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  submitBtn: {
    flex: 1.3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: Colors.primary,
  },
  submitBtnText: {
    color: Colors.textInverse,
    fontSize: 14,
    fontWeight: '600',
  },
});
