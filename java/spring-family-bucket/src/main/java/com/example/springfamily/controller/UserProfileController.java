package com.example.springfamily.controller;

import com.example.springfamily.dto.UserProfileRequest;
import com.example.springfamily.dto.UserProfileResponse;
import com.example.springfamily.service.UserProfileService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserProfileController {

    private final UserProfileService userProfileService;

    public UserProfileController(UserProfileService userProfileService) {
        this.userProfileService = userProfileService;
    }

    @GetMapping
    public List<UserProfileResponse> findAll() {
        return userProfileService.findAll();
    }

    @GetMapping("/{id}")
    public UserProfileResponse findById(@PathVariable Long id) {
        return userProfileService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfileResponse create(@Valid @RequestBody UserProfileRequest request) {
        return userProfileService.create(request);
    }

    @PutMapping("/{id}")
    public UserProfileResponse update(@PathVariable Long id, @Valid @RequestBody UserProfileRequest request) {
        return userProfileService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) {
        userProfileService.delete(id);
    }
}
