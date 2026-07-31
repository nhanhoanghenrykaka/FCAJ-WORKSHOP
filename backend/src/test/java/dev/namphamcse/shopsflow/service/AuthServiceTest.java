package dev.namphamcse.shopsflow.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import dev.namphamcse.shopsflow.dto.request.GoogleAuthRequest;
import dev.namphamcse.shopsflow.dto.request.LoginRequest;
import dev.namphamcse.shopsflow.dto.request.RegisterRequest;
import dev.namphamcse.shopsflow.dto.response.AuthResponse;
import dev.namphamcse.shopsflow.entity.User;
import dev.namphamcse.shopsflow.entity.enums.Role;
import dev.namphamcse.shopsflow.exception.BusinessRuleViolationException;
import dev.namphamcse.shopsflow.exception.DuplicateResourceException;
import dev.namphamcse.shopsflow.repository.UserRepository;
import dev.namphamcse.shopsflow.security.JwtUtil;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    UserRepository userRepo;
    @Mock
    PasswordEncoder passwordEncoder;
    @Mock
    JwtUtil jwtUtil;
    @Mock
    AuthenticationManager authenticationManager;

    @Mock
    NotificationService notificationService;
    @Mock
    RegistrationOtpService registrationOtpService;
    @Mock
    GoogleIdentityService googleIdentityService;

    @InjectMocks
    AuthService authService;

    private RegisterRequest registerRequest;
    private LoginRequest loginRequest;

    @BeforeEach
    void setUp() {
        registerRequest = new RegisterRequest();
        registerRequest.setName("Nam");
        registerRequest.setEmail("n@gmail.com");
        registerRequest.setPassword("password123");
        registerRequest.setVerificationToken("verification-token");
        lenient().when(registrationOtpService.normalizeAndValidateGmail("n@gmail.com"))
                .thenReturn("n@gmail.com");

        loginRequest = new LoginRequest();
        loginRequest.setEmail("n@gmail.com");
        loginRequest.setPassword("password123");
    }


    @Test
    void register_throws_whenEmailAlreadyExists() {
        when(userRepo.existsByEmailIgnoreCase("n@gmail.com")).thenReturn(true);

        assertThrows(DuplicateResourceException.class,
                () -> authService.register(registerRequest));

        verify(userRepo, never()).save(any());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void register_hashesPassword_savesUser() {
        when(userRepo.existsByEmailIgnoreCase("n@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("HASHED");
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(1L);
            return user;
        });

        authService.register(registerRequest);

        verify(registrationOtpService).assertVerified("n@gmail.com", "verification-token");
        verify(registrationOtpService).consumeVerification("n@gmail.com");

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("Nam", saved.getName());
        assertEquals("n@gmail.com", saved.getEmail());
        assertEquals("HASHED", saved.getPassword());
        verify(jwtUtil, never()).generateToken(any());
    }

    @Test
    void register_doesNotStoreRawPassword() {
        when(userRepo.existsByEmailIgnoreCase("n@gmail.com")).thenReturn(false);
        when(passwordEncoder.encode("password123")).thenReturn("HASHED");
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        authService.register(registerRequest);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertEquals("HASHED", captor.getValue().getPassword());
    }


    @Test
    void login_authenticates_returnsToken_onValidCredentials() {
        User user = new User("Nam", "n@gmail.com", "HASHED");
        user.setId(1L);

        when(userRepo.findByEmailIgnoreCase("n@gmail.com")).thenReturn(Optional.of(user));
        when(jwtUtil.generateToken(user)).thenReturn("jwt-token");

        AuthResponse response = authService.login(loginRequest);

        ArgumentCaptor<UsernamePasswordAuthenticationToken> captor =
                ArgumentCaptor.forClass(UsernamePasswordAuthenticationToken.class);
        verify(authenticationManager).authenticate(captor.capture());
        assertEquals("n@gmail.com", captor.getValue().getPrincipal());
        assertEquals("password123", captor.getValue().getCredentials());

        assertEquals("jwt-token", response.getToken());
        assertNotNull(response.getUser());
        assertEquals(1L, response.getUser().getId());
        assertEquals("Nam", response.getUser().getName());
        assertEquals("n@gmail.com", response.getUser().getEmail());
        assertEquals(Role.USER, response.getUser().getRole());
    }

    @Test
    void googleAuth_createsCustomerAndReturnsAppJwt() {
        GoogleAuthRequest request = new GoogleAuthRequest();
        request.setCredential("google-id-token");

        when(googleIdentityService.verify("google-id-token"))
                .thenReturn(new GoogleIdentityService.GoogleProfile(
                        "google-sub-1", "newuser@gmail.com", "New User"));
        when(userRepo.findByGoogleSubject("google-sub-1")).thenReturn(Optional.empty());
        when(userRepo.findByEmailIgnoreCase("newuser@gmail.com")).thenReturn(Optional.empty());
        when(userRepo.save(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(10L);
            return user;
        });
        when(jwtUtil.generateToken(any(User.class))).thenReturn("google-app-jwt");

        AuthResponse response = authService.googleAuth(request);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        User saved = captor.getValue();
        assertEquals("newuser@gmail.com", saved.getEmail());
        assertEquals("New User", saved.getName());
        assertEquals("google-sub-1", saved.getGoogleSubject());
        assertEquals(Role.USER, saved.getRole());
        org.junit.jupiter.api.Assertions.assertTrue(
                saved.getPassword().startsWith("{google-disabled}"));
        verify(passwordEncoder, never()).encode(any());
        assertEquals("google-app-jwt", response.getToken());
        assertEquals("newuser@gmail.com", response.getUser().getEmail());
    }

    @Test
    void googleAuth_linksExistingCustomerByVerifiedGmail() {
        GoogleAuthRequest request = new GoogleAuthRequest();
        request.setCredential("google-id-token");

        User existing = new User("Existing User", "existing@gmail.com", "HASHED");
        existing.setId(11L);

        when(googleIdentityService.verify("google-id-token"))
                .thenReturn(new GoogleIdentityService.GoogleProfile(
                        "google-sub-2", "existing@gmail.com", "Google Name"));
        when(userRepo.findByGoogleSubject("google-sub-2")).thenReturn(Optional.empty());
        when(userRepo.findByEmailIgnoreCase("existing@gmail.com")).thenReturn(Optional.of(existing));
        when(userRepo.save(existing)).thenReturn(existing);
        when(jwtUtil.generateToken(existing)).thenReturn("linked-jwt");

        AuthResponse response = authService.googleAuth(request);

        assertEquals("google-sub-2", existing.getGoogleSubject());
        assertEquals("linked-jwt", response.getToken());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void googleAuth_rejectsAdminAccount() {
        GoogleAuthRequest request = new GoogleAuthRequest();
        request.setCredential("google-id-token");

        User admin = new User("Admin", "admin@gmail.com", "HASHED");
        admin.setId(1L);
        admin.setRole(Role.ADMIN);

        when(googleIdentityService.verify("google-id-token"))
                .thenReturn(new GoogleIdentityService.GoogleProfile(
                        "admin-google-sub", "admin@gmail.com", "Admin"));
        when(userRepo.findByGoogleSubject("admin-google-sub")).thenReturn(Optional.of(admin));

        assertThrows(BusinessRuleViolationException.class, () -> authService.googleAuth(request));
        verify(jwtUtil, never()).generateToken(admin);
    }

    @Test
    void login_throws_whenAuthenticationFails() {
        when(authenticationManager.authenticate(any()))
                .thenThrow(new BadCredentialsException("bad creds"));

        assertThrows(BadCredentialsException.class,
                () -> authService.login(loginRequest));

        verify(userRepo).findByEmailIgnoreCase("n@gmail.com");
        verify(jwtUtil, never()).generateToken(any());
    }
}
