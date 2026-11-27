import React, { useEffect, useMemo, useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useWalkPlanner } from '../context/WalkPlannerContext';
import { getAuthErrorMessage, getStrings } from '../i18n/translations';
import { COLORS, ELEVATION, UI_FONT_FAMILY } from '../theme/colors';
import { pickDogProfilePhoto } from '../utils/dogPhotoPicker';
import { validateEmail, validateStrongPassword } from '../utils/validation';
import { UiIcon } from './UiIcons';

export type AuthModalMode = 'signin' | 'signup' | 'reset' | 'delete';

interface AuthModalProps {
  visible: boolean;
  initialMode?: AuthModalMode;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  visible,
  initialMode = 'signin',
  onClose,
}) => {
  const { language, memberProfile, updateMemberProfile } = useWalkPlanner();
  const {
    isFirebaseConfigured,
    signIn,
    signUp,
    resetPassword,
    deleteAccount,
  } = useAuth();
  const t = getStrings(language);

  const [mode, setMode] = useState<AuthModalMode>(initialMode);
  const [displayName, setDisplayName] = useState(memberProfile.displayName);
  const [avatarDraft, setAvatarDraft] = useState<string | null>(
    memberProfile.avatarUri ?? null
  );
  const [isPickingAvatar, setIsPickingAvatar] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const [infoText, setInfoText] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setMode(initialMode);
      setDisplayName(memberProfile.displayName);
      setAvatarDraft(memberProfile.avatarUri ?? null);
      setPassword('');
      setShowPassword(false);
      setErrorText(null);
      setInfoText(null);
    } else {
      setPassword('');
      setShowPassword(false);
      setErrorText(null);
      setInfoText(null);
    }
  }, [visible, initialMode, memberProfile.displayName, memberProfile.avatarUri]);

  const handlePickUserPhoto = async () => {
    if (isPickingAvatar) return;
    setIsPickingAvatar(true);
    setErrorText(null);
    try {
      const res = await pickDogProfilePhoto('library');
      if (res.status === 'picked') {
        setAvatarDraft(res.dataUri);
      } else if (res.status === 'error') {
        setErrorText(res.message);
      }
    } finally {
      setIsPickingAvatar(false);
    }
  };

  const switchMode = (nextMode: AuthModalMode) => {
    setMode(nextMode);
    setPassword('');
    setShowPassword(false);
    setErrorText(null);
    setInfoText(null);
  };

  const passwordAssessment = useMemo(
    () => validateStrongPassword(password),
    [password]
  );

  const modalTitle =
    mode === 'signup'
      ? t.authTitleSignUp
      : mode === 'reset'
        ? t.authTitleReset
        : mode === 'delete'
          ? t.authTitleDelete
          : t.authTitleSignIn;

  const handleSubmit = async () => {
    if (submitting) return;
    setErrorText(null);
    setInfoText(null);

    if (mode === 'delete') {
      if (!password) {
        setErrorText(t.authErrInvalidCredentials);
        return;
      }
      setSubmitting(true);
      try {
        const res = await deleteAccount(password);
        if (res.ok) {
          setPassword('');
          onClose();
        } else {
          setErrorText(getAuthErrorMessage(res.errorKey, language));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      setErrorText(t.authErrInvalidEmail);
      return;
    }

    if (mode === 'reset') {
      setSubmitting(true);
      try {
        const res = await resetPassword(emailCheck.normalized);
        if (res.ok) {
          setInfoText(t.authResetSentNotice);
        } else {
          setErrorText(getAuthErrorMessage(res.errorKey, language));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (mode === 'signup') {
      if (!passwordAssessment.valid) {
        setErrorText(t.authErrWeakPassword);
        return;
      }
      setSubmitting(true);
      try {
        const res = await signUp(emailCheck.normalized, password, displayName);
        if (res.ok) {
          if (displayName.trim() || avatarDraft !== (memberProfile.avatarUri ?? null)) {
            updateMemberProfile({
              displayName: displayName.trim(),
              avatarUri: avatarDraft,
            });
          }
          setPassword('');
          onClose();
        } else {
          setErrorText(getAuthErrorMessage(res.errorKey, language));
        }
      } finally {
        setSubmitting(false);
      }
      return;
    }

    // mode === 'signin'
    if (!password) {
      setErrorText(t.authErrInvalidCredentials);
      return;
    }
    setSubmitting(true);
    try {
      const res = await signIn(emailCheck.normalized, password);
      if (res.ok) {
        setPassword('');
        onClose();
      } else {
        setErrorText(getAuthErrorMessage(res.errorKey, language));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const strengthColor =
    passwordAssessment.strength === 'strong'
      ? COLORS.brand
      : passwordAssessment.strength === 'good'
        ? '#D97706'
        : COLORS.avoidText;

  const strengthFillBars =
    password.length === 0
      ? 0
      : passwordAssessment.strength === 'strong'
        ? 3
        : passwordAssessment.strength === 'good'
          ? 2
          : 1;

  const strengthLabel =
    password.length === 0
      ? t.authStrengthHint
      : passwordAssessment.strength === 'strong'
        ? t.authStrengthStrong
        : passwordAssessment.strength === 'good'
          ? t.authStrengthGood
          : t.authStrengthWeak;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      aria-label={modalTitle}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={onClose} />
        <View style={[styles.sheet, ELEVATION.floating]}>
          <View style={styles.grabHandle} />

          <View style={styles.headerRow}>
            <View style={styles.headerTitleGroup}>
              <View
                style={[
                  styles.headerIconTile,
                  mode === 'delete' && styles.headerIconTileDanger,
                ]}
              >
                <UiIcon
                  name={mode === 'delete' ? 'warning' : 'cloud'}
                  size={16}
                  color={mode === 'delete' ? COLORS.avoidText : COLORS.brand}
                />
              </View>
              <Text style={styles.headerTitle}>{modalTitle}</Text>
            </View>
            <Pressable
              onPress={onClose}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t.closeBtn}
              style={styles.closeBtn}
            >
              <UiIcon name="close" size={16} color={COLORS.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {!isFirebaseConfigured && mode !== 'delete' ? (
              <View style={styles.setupCard}>
                <View style={styles.setupHeaderRow}>
                  <UiIcon name="lock" size={16} color={COLORS.brandDark} />
                  <Text style={styles.setupTitle}>{t.authSetupStepsTitle}</Text>
                </View>
                <Text style={styles.setupBody}>{t.authSetupStepsBody}</Text>
                <Pressable
                  onPress={onClose}
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>{t.doneBtn}</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {mode === 'signin' || mode === 'signup' ? (
                  <View style={styles.segmentedRow}>
                    <Pressable
                      onPress={() => switchMode('signin')}
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode === 'signin' }}
                      style={[
                        styles.segmentBtn,
                        mode === 'signin' && styles.segmentBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          mode === 'signin' && styles.segmentTextActive,
                        ]}
                      >
                        {t.authTabSignIn}
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => switchMode('signup')}
                      accessibilityRole="button"
                      accessibilityState={{ selected: mode === 'signup' }}
                      style={[
                        styles.segmentBtn,
                        mode === 'signup' && styles.segmentBtnActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentText,
                          mode === 'signup' && styles.segmentTextActive,
                        ]}
                      >
                        {t.authTabSignUp}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                {mode === 'delete' ? (
                  <View style={styles.dangerWarningBox}>
                    <UiIcon name="warning" size={16} color={COLORS.avoidText} />
                    <Text style={styles.dangerWarningText}>
                      {t.authDeleteWarning}
                    </Text>
                  </View>
                ) : null}

                {mode === 'signup' ? (
                  <View style={styles.signupProfileRow}>
                    <Pressable
                      onPress={handlePickUserPhoto}
                      disabled={isPickingAvatar || submitting}
                      accessibilityRole="button"
                      accessibilityLabel={t.memberUploadAvatar}
                      style={({ pressed }) => [
                        styles.signupAvatarBtn,
                        pressed && styles.pressed,
                      ]}
                    >
                      {avatarDraft ? (
                        <Image
                          source={{ uri: avatarDraft }}
                          style={styles.signupAvatarImg}
                        />
                      ) : (
                        <UiIcon name="camera" size={20} color={COLORS.brandDark} />
                      )}
                    </Pressable>
                    <View style={styles.signupNameCol}>
                      <Text style={styles.fieldLabel}>
                        {t.authDisplayNameLabel}
                      </Text>
                      <View style={styles.inputBox}>
                        <TextInput
                          value={displayName}
                          onChangeText={setDisplayName}
                          placeholder={t.authDisplayNamePlaceholder}
                          placeholderTextColor={COLORS.textMuted}
                          maxLength={40}
                          editable={!submitting}
                          style={styles.input}
                        />
                      </View>
                    </View>
                  </View>
                ) : null}

                {mode !== 'delete' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>{t.authEmailLabel}</Text>
                    <View style={styles.inputBox}>
                      <UiIcon name="mail" size={16} color={COLORS.textMuted} />
                      <TextInput
                        value={email}
                        onChangeText={setEmail}
                        placeholder={t.authEmailPlaceholder}
                        placeholderTextColor={COLORS.textMuted}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="email-address"
                        textContentType="emailAddress"
                        autoComplete="email"
                        maxLength={254}
                        editable={!submitting}
                        style={styles.input}
                      />
                    </View>
                  </View>
                ) : null}

                {mode !== 'reset' ? (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>
                      {mode === 'delete'
                        ? t.authCurrentPasswordLabel
                        : t.authPasswordLabel}
                    </Text>
                    <View style={styles.inputBox}>
                      <UiIcon name="lock" size={16} color={COLORS.textMuted} />
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        placeholder={
                          mode === 'signup'
                            ? t.authNewPasswordPlaceholder
                            : t.authPasswordPlaceholder
                        }
                        placeholderTextColor={COLORS.textMuted}
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        autoCorrect={false}
                        textContentType={
                          mode === 'signup' ? 'newPassword' : 'password'
                        }
                        autoComplete={
                          mode === 'signup'
                            ? 'new-password'
                            : 'current-password'
                        }
                        maxLength={128}
                        editable={!submitting}
                        onSubmitEditing={handleSubmit}
                        style={styles.input}
                      />
                      <Pressable
                        onPress={() => setShowPassword((prev) => !prev)}
                        hitSlop={8}
                        accessibilityRole="button"
                      >
                        <Text style={styles.toggleSecretText}>
                          {showPassword
                            ? t.authHidePassword
                            : t.authShowPassword}
                        </Text>
                      </Pressable>
                    </View>

                    {mode === 'signup' ? (
                      <View style={styles.strengthWrap}>
                        <View style={styles.strengthBarsRow}>
                          {[1, 2, 3].map((step) => (
                            <View
                              key={step}
                              style={[
                                styles.strengthBar,
                                step <= strengthFillBars && {
                                  backgroundColor: strengthColor,
                                },
                              ]}
                            />
                          ))}
                        </View>
                        <Text
                          style={[
                            styles.strengthLabel,
                            password.length > 0 && { color: strengthColor },
                          ]}
                        >
                          {strengthLabel}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                {errorText ? (
                  <View style={styles.errorBanner}>
                    <UiIcon name="warning" size={14} color={COLORS.avoidText} />
                    <Text style={styles.errorBannerText}>{errorText}</Text>
                  </View>
                ) : null}

                {infoText ? (
                  <View style={styles.infoBanner}>
                    <UiIcon name="check" size={14} color={COLORS.brandDark} />
                    <Text style={styles.infoBannerText}>{infoText}</Text>
                  </View>
                ) : null}

                <Pressable
                  onPress={handleSubmit}
                  disabled={submitting}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    mode === 'delete' && styles.dangerBtn,
                    submitting && styles.btnDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={styles.primaryBtnText}>
                    {submitting
                      ? t.authWorkingStatus
                      : mode === 'signup'
                        ? t.authSubmitSignUp
                        : mode === 'reset'
                          ? t.authSubmitReset
                          : mode === 'delete'
                            ? t.authSubmitDelete
                            : t.authSubmitSignIn}
                  </Text>
                </Pressable>

                {mode === 'signin' ? (
                  <Pressable
                    onPress={() => switchMode('reset')}
                    style={styles.secondaryLinkBtn}
                  >
                    <Text style={styles.secondaryLinkText}>
                      {t.authForgotPasswordLink}
                    </Text>
                  </Pressable>
                ) : null}

                {mode === 'reset' ? (
                  <Pressable
                    onPress={() => switchMode('signin')}
                    style={styles.secondaryLinkBtn}
                  >
                    <Text style={styles.secondaryLinkText}>
                      {t.authBackToSignIn}
                    </Text>
                  </Pressable>
                ) : null}

                {mode === 'delete' ? (
                  <Pressable onPress={onClose} style={styles.secondaryLinkBtn}>
                    <Text style={styles.secondaryLinkText}>
                      {t.authCancelBtn}
                    </Text>
                  </Pressable>
                ) : null}

                {mode !== 'delete' ? (
                  <Text style={styles.footnote}>{t.authPrivacyFootnote}</Text>
                ) : null}
              </>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16, 35, 28, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  dismissArea: {
    width: '100%',
    flex: 1,
  },
  sheet: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 24,
    maxHeight: '88%',
    gap: 12,
  },
  grabHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  headerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    flex: 1,
  },
  headerIconTile: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: COLORS.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconTileDanger: {
    backgroundColor: COLORS.avoidBg,
  },
  headerTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 16.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    gap: 13,
    paddingBottom: 8,
  },
  segmentedRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  segmentText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  segmentTextActive: {
    color: COLORS.brandDark,
    fontWeight: '800',
  },
  setupCard: {
    backgroundColor: COLORS.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 14,
    gap: 10,
  },
  setupHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  setupTitle: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 14.5,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  setupBody: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    lineHeight: 19,
    color: COLORS.textSecondary,
  },
  dangerWarningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
    borderRadius: 14,
    padding: 12,
  },
  dangerWarningText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    color: COLORS.avoidText,
  },
  fieldGroup: {
    gap: 6,
  },
  signupProfileRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  signupAvatarBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.brandLight,
    borderWidth: 1.5,
    borderColor: COLORS.brand,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signupAvatarImg: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  signupNameCol: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  input: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 14.5,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  toggleSecretText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brandDark,
  },
  strengthWrap: {
    gap: 5,
    marginTop: 2,
  },
  strengthBarsRow: {
    flexDirection: 'row',
    gap: 6,
  },
  strengthBar: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.borderSubtle,
  },
  strengthLabel: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.avoidBg,
    borderWidth: 1,
    borderColor: COLORS.avoidBorder,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  errorBannerText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.avoidText,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.idealBg,
    borderWidth: 1,
    borderColor: COLORS.idealBorder,
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 11,
  },
  infoBannerText: {
    fontFamily: UI_FONT_FAMILY,
    flex: 1,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  primaryBtn: {
    backgroundColor: COLORS.brand,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dangerBtn: {
    backgroundColor: COLORS.avoidText,
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    fontFamily: UI_FONT_FAMILY,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  secondaryLinkBtn: {
    alignSelf: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  secondaryLinkText: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 12.5,
    fontWeight: '700',
    color: COLORS.brandDark,
  },
  footnote: {
    fontFamily: UI_FONT_FAMILY,
    fontSize: 11.5,
    lineHeight: 16.5,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});
