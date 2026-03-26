#!/usr/bin/env python
# -*- config: utf-8 -*-

import os
import sys
import distro
import pytest
import platform
from conftest import run_benchmark
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../../')))
from logger import logger_main

def assert_calls():
    assert not distro.name().startswith(('Red', 'Debian'))
    assert distro.name().startswith('Ubuntu')
    assert os.path.expanduser('~') == '/root'
    assert os.path.exists('/Test')


@pytest.mark.skipif(sys.version_info < (3, 8), reason="PyTests-Require python version 3.8 or higher")
@run_benchmark('python_version')
def test_python_version(benchmark):
    results = benchmark(lambda: sys.version_info >= (3, 8))
    assert results == True
    if not results:
        logger_main.logger.warning(f'Python Dependencies Check: {sys.version.split()[0]}')
        logger_main.logger.error(f'Python version 3.8 or higher is required: Version:\t{sys.version.split()[0]} is returned instead')
        logger_main.logger.info('Please Upgrade Your Python version to 3.8 or Higher:')
        exit(1)


@pytest.mark.skipif(platform.system() != 'Linux', reason='Current OS is not a Linux System:')
@run_benchmark('OS Check')
def test_linux_os(benchmark):
    result = benchmark(lambda: platform.system() == 'Linux')
    assert result


@pytest.mark.skipif(not distro.name().startswith('Ubuntu'), reason='This Instance is not Ubuntu Distribution')
@run_benchmark('ubuntu_box')
def test_ubuntu_box(benchmark):
    benchmark(assert_calls)


@pytest.mark.skipif(not distro.name().startswith('Debian'), reason='This Instance is not Debian Distribution')
@run_benchmark("test_deb_box")
def test_deb_box(benchmark):
    results = benchmark(lambda: (
        not distro.name().startswith(('Red', 'Ubuntu')),
        distro.name().startswith('Debian'),
        os.path.expanduser('~') == '/root',
        os.path.exists('/Test')
    ))
    assert results


@pytest.mark.skipif(not distro.name().startswith('Red'), reason='This Instance is not RedHat Distribution')
@run_benchmark("Redhat Box")
def test_redhat_box(benchmark):
    results = benchmark(lambda: (not distro.name().startswith(('Debian', 'Ubuntu')),))
    assert results


@pytest.mark.skipif(distro.id() != 'darwin', reason="Current OS is not a Mac System:")
@run_benchmark("Mac Box")
def test_mac_os(benchmark):
    result = benchmark(lambda: distro.id() == 'darwin')
    assert result == True
    result = benchmark(lambda: os.path.expanduser('~').startswith('/Users'))
    assert result == True


@pytest.mark.skipif(platform.system() != 'win32', reason="Current OS is not a Windows Based System:")
@run_benchmark("Windows Box")
def test_windows_os(benchmark):
    result = benchmark(lambda: sys.platform == 'win32')
    assert result == True
    result = benchmark(lambda: os.path.exists('C:\\'))
    assert result == True
    result = benchmark(lambda: platform.win32_ver()[0] == '64bit')
    assert result == True
