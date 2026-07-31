package dev.namphamcse.shopsflow.dto.response;

import dev.namphamcse.shopsflow.entity.enums.Role;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String phone;
    private String profileImageUrl;
    private boolean banned;
    private Role role;
}
