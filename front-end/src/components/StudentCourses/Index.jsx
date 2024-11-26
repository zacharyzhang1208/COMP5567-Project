import React, { useState, useEffect } from 'react';
import CourseCard from '../common/CourseCard/Index';
import SearchBar from '../common/SearchBar/Index';
import Button from '../common/Button/Index';
import { getStudentEnrolledCourses, submitAttendance } from '../../services/api';
import '../../css/StudentCourses.css';
import '../../css/Courses.css';
import '../../css/Modal.css';
import { generateRandomName } from '../../utils/nameGenerator';

const StudentCourses = () => {
    const [loading, setLoading] = useState(false);
    const [courses, setCourses] = useState([]);
    const [selectedCourse, setSelectedCourse] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showCheckin, setShowCheckin] = useState(false);
    const [error, setError] = useState('');
    const [checkinCode, setCheckinCode] = useState('');
    const [checkinLoading, setCheckinLoading] = useState(false);
    const [checkinError, setCheckinError] = useState('');

    useEffect(() => {
        fetchCourses();
    }, []);

    const fetchCourses = async () => {
        try {
            setLoading(true);
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user || !user.id) {
                throw new Error('User information not found');
            }

            const response = await getStudentEnrolledCourses(user.id);
            console.log('Received courses:', response); // 调试日志

            // 将返回的课程数据转换为组件需要的格式
            const formattedCourses = response.courses.map(course => ({
                id: course.courseId,           // 使用课程ID作为唯一标识
                name: course.courseId,         // 使用课程ID作为显示名称
                courseId: course.courseId,     // 保存原始课程ID
                instructor: generateRandomName(),         // 使用教师ID
                credits: 3,                    // 默认学分
                semester: 'Spring 2024',       // 当学期
                description: 'Course description...',
                prerequisites: 'None',
                schedule: 'Mon/Wed 10:00-11:30',
                location: 'Room 101',
                capacity: 30,
                enrolled: 0  // 初始值为0，后续会更新
            }));

            console.log('Formatted courses:', formattedCourses); // 调试日志

            setCourses(formattedCourses);
        } catch (error) {
            console.error('Failed to fetch courses:', error);
            setError('Failed to load courses');
        } finally {
            setLoading(false);
        }
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCourse(null);
    };

    const handleCardClick = (course) => {
        setSelectedCourse(course);
        setIsModalOpen(true);
    };

    const handleCheckin = () => {
        setShowCheckin(true);
    };

    const handleCloseCheckin = () => {
        setShowCheckin(false);
    };

    const handleCheckinSubmit = async () => {
        if (!checkinCode.trim()) {
            setCheckinError('Please enter the check-in code');
            return;
        }

        try {
            setCheckinLoading(true);
            setCheckinError('');
            
            const user = JSON.parse(localStorage.getItem('user'));
            const response = await submitAttendance({
                studentId: user.id,
                password: user.password,
                courseId: selectedCourse.courseId,
                verifyCode: checkinCode.trim()
            });
            console.log("response", response);

            if (response.success) {
                alert('Check-in successful!');
                handleCloseCheckin();
            } else {
                setCheckinError(response.message || 'Check-in failed');
            }
        } catch (error) {
            console.error('Check-in failed:', error);
            setCheckinError(error.message || 'Failed to submit check-in');
        } finally {
            setCheckinLoading(false);
        }
    };

    if (loading) {
        return <div className="courses-loading">Loading courses...</div>;
    }

    if (error) {
        return <div className="courses-error">{error}</div>;
    }

    return (
        <div className="courses-container">
            <div className="courses-header">
                <SearchBar />
            </div>
            {courses.length === 0 ? (
                <div className="no-courses">
                    No courses found. Please enroll in some courses.
                </div>
            ) : (
                <div className="courses-grid">
                    {courses.map(course => (
                        <CourseCard 
                            key={course.id} 
                            course={course} 
                            onClick={handleCardClick}
                        />
                    ))}
                </div>
            )}

            {isModalOpen && selectedCourse && !showCheckin && (
                <div className="modal-overlay" onClick={handleCloseModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleCloseModal}>×</button>
                        <h2>{selectedCourse.name}</h2>
                        <div className="modal-info">
                            <div className="info-section">
                                <h3>Course Information</h3>
                                <p><strong>Instructor:</strong> {selectedCourse.teacherName}</p>
                                <p><strong>Course ID:</strong> {selectedCourse.courseId}</p>
                                <p><strong>Credits:</strong> {selectedCourse.credits}</p>
                                <p><strong>Semester:</strong> {selectedCourse.semester}</p>
                                <p><strong>Schedule:</strong> {selectedCourse.schedule}</p>
                                <p><strong>Location:</strong> {selectedCourse.location}</p>
                            </div>
                            <div className="info-section">
                                <h3>Description</h3>
                                <p>{selectedCourse.description}</p>
                            </div>
                            <div className="info-section">
                                <h3>Prerequisites</h3>
                                <p>{selectedCourse.prerequisites}</p>
                            </div>
                        </div>
                        <div className="modal-actions">
                            <button 
                                className="modal-btn checkin"
                                onClick={handleCheckin}
                            >
                                Student Check-in
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCheckin && (
                <div className="modal-overlay" onClick={handleCloseCheckin}>
                    <div className="checkin-modal" onClick={e => e.stopPropagation()}>
                        <button className="modal-close" onClick={handleCloseCheckin}>×</button>
                        <h2>Course Check-in</h2>
                        <div className="checkin-content">
                            <div className="checkin-info">
                                <p><strong>Course:</strong> {selectedCourse.name}</p>
                                <p><strong>Instructor:</strong> {selectedCourse.teacherName}</p>
                                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
                            </div>
                            <div className="checkin-form">
                                <div className="form-group">
                                    <label>Check-in Code:</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter the check-in code"
                                        className="checkin-input"
                                        value={checkinCode}
                                        onChange={(e) => {
                                            setCheckinCode(e.target.value);
                                            setCheckinError('');
                                        }}
                                    />
                                    {checkinError && (
                                        <div className="checkin-error">{checkinError}</div>
                                    )}
                                </div>
                                <Button 
                                    onClick={handleCheckinSubmit}
                                    loading={checkinLoading}
                                    disabled={checkinLoading}
                                >
                                    Submit Check-in
                                </Button>
                            </div>
                            <div className="checkin-status">
                                <p>Please enter the check-in code provided by your instructor.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCourses;