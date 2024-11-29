import React, { useState, useEffect } from 'react';
import CourseCard from '../common/CourseCard/Index';
import './style.css';

function StudentRegisterCourse() {
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(false);

    // 模拟数据
    const mockCourses = [
        {
            id: 1,
            name: "Introduction to Computer Science",
            teacher: "Dr. Smith",
            credits: 3,
            semester: "Fall 2024",
            schedule: "Monday, Wednesday 10:00-11:30"
        },
        {
            id: 2,
            name: "Data Structures and Algorithms",
            teacher: "Dr. Johnson",
            credits: 4,
            semester: "Fall 2024",
            schedule: "Tuesday, Thursday 14:00-15:30"
        },
        {
            id: 3,
            name: "Web Development",
            teacher: "Prof. Williams",
            credits: 3,
            semester: "Fall 2024",
            schedule: "Wednesday, Friday 13:00-14:30"
        },
        {
            id: 4,
            name: "Database Systems",
            teacher: "Dr. Brown",
            credits: 4,
            semester: "Fall 2024",
            schedule: "Monday, Thursday 15:00-16:30"
        }
    ];

    useEffect(() => {
        // 模拟API调用延迟
        setLoading(true);
        setTimeout(() => {
            setCourses(mockCourses);
            setLoading(false);
        }, 1000);
    }, []);

    const handleRegister = (course) => {
        alert(`Successfully registered for ${course.name}`);
    };

    return (
        <div className="content-container">
            <h2 className="page-title">Available Courses</h2>
            {loading ? (
                <div className="loading">Loading...</div>
            ) : (
                <div className="courses-grid">
                    {courses.map(course => (
                        <CourseCard
                            key={course.id}
                            course={{
                                ...course,
                                instructor: course.teacher
                            }}
                            onClick={handleRegister}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export default StudentRegisterCourse; 