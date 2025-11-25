-- phpMyAdmin SQL Dump
-- version 5.1.1
-- https://www.phpmyadmin.net/
--
-- Host: db
-- Generation Time: Oct 30, 2022 at 09:54 AM
-- Server version: 8.0.24
-- PHP Version: 7.4.20

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `sd2-db`
--

-- --------------------------------------------------------

--
-- Table structure for table `test_table`
--

CREATE TABLE `test_table` (
  `id` int NOT NULL,
  `name` varchar(512) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `test_table`
--

INSERT INTO `test_table` (`id`, `name`) VALUES
(1, 'Lisa'),
(2, 'Kimia');

-- --------------------------------------------------------

--
-- Table structure for table `inventory_items`
--

CREATE TABLE `inventory_items` (
  `id` int NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(120) DEFAULT NULL,
  `location` varchar(160) NOT NULL,
  `expiry_date` date NOT NULL,
  `quantity` int NOT NULL DEFAULT '0',
  `original_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `discount_percent` decimal(5,2) NOT NULL DEFAULT '0.00',
  `status` enum('available','reserved','claimed','expired') NOT NULL DEFAULT 'available',
  `last_updated` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `inventory_items`
--

INSERT INTO `inventory_items` (`id`, `product_name`, `category`, `location`, `expiry_date`, `quantity`, `original_price`, `discount_percent`, `status`, `last_updated`) VALUES
(1, 'Sourdough Loaf', 'Bakery', 'Brooklyn Fresh Mart', '2025-05-02', 12, 6.50, '35.00', 'available', '2025-05-01 07:30:00'),
(2, 'Organic Spinach Box', 'Produce', 'Queens Green Grocers', '2025-05-03', 20, 4.20, '45.00', 'reserved', '2025-05-01 07:40:00'),
(3, 'Greek Yogurt (6 pack)', 'Dairy', 'Harlem Pantry Co.', '2025-05-06', 16, 9.50, '50.00', 'available', '2025-05-01 07:45:00'),
(4, 'Free-range Eggs (12)', 'Dairy', 'Astoria Co-op', '2025-05-01', 10, 5.80, '40.00', 'claimed', '2025-05-01 07:50:00'),
(5, 'Veggie Burrito Bowls', 'Prepared Meals', 'Downtown Deli Hub', '2025-05-04', 18, 7.25, '30.00', 'available', '2025-05-01 07:55:00'),
(6, 'Cold Brew Growler', 'Beverages', 'SoHo Coffee Collective', '2025-05-05', 8, 11.00, '25.00', 'reserved', '2025-05-01 08:00:00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `test_table`
--
ALTER TABLE `test_table`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `inventory_items`
--
ALTER TABLE `inventory_items`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_expiry_date` (`expiry_date`),
  ADD KEY `idx_status` (`status`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `test_table`
--
ALTER TABLE `test_table`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `inventory_items`
--
ALTER TABLE `inventory_items`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
