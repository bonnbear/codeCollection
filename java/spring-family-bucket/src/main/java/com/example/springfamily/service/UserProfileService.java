package com.example.springfamily.service;

import com.example.springfamily.dto.UserProfileRequest;
import com.example.springfamily.dto.UserProfileResponse;
import com.example.springfamily.entity.UserProfile;
import com.example.springfamily.exception.ResourceNotFoundException;
import com.example.springfamily.repository.UserProfileRepository;
import java.util.List;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.CachePut;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.Caching;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class UserProfileService {

    private final UserProfileRepository userProfileRepository;

    public UserProfileService(UserProfileRepository userProfileRepository) {
        this.userProfileRepository = userProfileRepository;
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "userProfiles")
    public List<UserProfileResponse> findAll() {
        return userProfileRepository.findAll().stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional(readOnly = true)
    @Cacheable(cacheNames = "userProfile", key = "#id")
    public UserProfileResponse findById(Long id) {
        UserProfile profile = userProfileRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User profile not found: " + id));
        return toResponse(profile);
    }

    @Transactional
    @CachePut(cacheNames = "userProfile", key = "#result.id")
    @CacheEvict(cacheNames = "userProfiles", allEntries = true)
    public UserProfileResponse create(UserProfileRequest request) {
        UserProfile entity = new UserProfile();
        entity.setName(request.getName());
        entity.setEmail(request.getEmail());
        entity.setAge(request.getAge());

        UserProfile saved = userProfileRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    @CachePut(cacheNames = "userProfile", key = "#id")
    @CacheEvict(cacheNames = "userProfiles", allEntries = true)
    public UserProfileResponse update(Long id, UserProfileRequest request) {
        UserProfile entity = userProfileRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("User profile not found: " + id));

        entity.setName(request.getName());
        entity.setEmail(request.getEmail());
        entity.setAge(request.getAge());

        UserProfile saved = userProfileRepository.save(entity);
        return toResponse(saved);
    }

    @Transactional
    @Caching(evict = {
        @CacheEvict(cacheNames = "userProfile", key = "#id"),
        @CacheEvict(cacheNames = "userProfiles", allEntries = true)
    })
    public void delete(Long id) {
        if (!userProfileRepository.existsById(id)) {
            throw new ResourceNotFoundException("User profile not found: " + id);
        }
        userProfileRepository.deleteById(id);
    }

    private UserProfileResponse toResponse(UserProfile userProfile) {
        return new UserProfileResponse(
            userProfile.getId(),
            userProfile.getName(),
            userProfile.getEmail(),
            userProfile.getAge()
        );
    }
}
