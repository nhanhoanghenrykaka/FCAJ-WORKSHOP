package dev.namphamcse.shopsflow.security;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import dev.namphamcse.shopsflow.repository.UserRepository;


@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private final UserRepository userRepository;
    public UserDetailsServiceImpl (UserRepository repo) {
        this.userRepository = repo;
    }
    @Override
    public UserDetails loadUserByUsername(String username) throws 
 UsernameNotFoundException {
    return userRepository.findByEmailIgnoreCase(username)
        .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
 }
}
