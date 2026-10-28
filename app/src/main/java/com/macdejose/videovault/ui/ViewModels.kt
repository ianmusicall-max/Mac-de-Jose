package com.macdejose.videovault.ui

import androidx.compose.runtime.Composable
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory

/** Builds a view model from the app container without pulling in a DI framework. */
@Composable
inline fun <reified VM : ViewModel> appViewModel(noinline create: () -> VM): VM =
    viewModel(factory = viewModelFactory { initializer { create() } })
